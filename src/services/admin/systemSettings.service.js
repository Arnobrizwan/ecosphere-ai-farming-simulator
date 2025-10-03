import { db } from '../firebase.config';
import { collection, addDoc, updateDoc, query, orderBy, limit, getDocs, doc } from 'firebase/firestore';

/**
 * System Settings Service (UCA2) - Configure system settings
 */
export class SystemSettingsService {
  constructor(adminId) {
    this.adminId = adminId;
    this.settingsCollection = collection(db, 'system_settings');
    this.auditCollection = collection(db, 'audit_events');
  }

  async updateSettings(settingsData) {
    const { category, settings } = settingsData;

    // Get current version
    const currentVersion = await this.getCurrentVersion(category);

    const newSettings = {
      category,
      settings,
      version: currentVersion + 1,
      updatedBy: this.adminId,
      updatedAt: Date.now(),
      changeHistory: [{
        version: currentVersion + 1,
        changes: settings,
        updatedBy: this.adminId,
        updatedAt: Date.now()
      }]
    };

    const docRef = await addDoc(this.settingsCollection, newSettings);

    await this.logAudit('settings_updated', category, { version: newSettings.version });

    return { id: docRef.id, ...newSettings };
  }

  async getCurrentVersion(category) {
    const q = query(
      this.settingsCollection,
      where('category', '==', category),
      orderBy('version', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    return snapshot.empty ? 0 : snapshot.docs[0].data().version;
  }

  async setFeatureFlag(flag, enabled) {
    const settings = await this.getSettings('featureFlags');
    const featureFlags = settings?.settings?.featureFlags || {};

    featureFlags[flag] = enabled;

    await this.updateSettings({
      category: 'featureFlags',
      settings: { featureFlags }
    });

    await this.logAudit('feature_flag_set', flag, { enabled });

    return { flag, enabled };
  }

  async getSettings(category) {
    const q = query(
      this.settingsCollection,
      where('category', '==', category),
      orderBy('version', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    return snapshot.empty ? null : {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  }

  async rollback(category, version) {
    const q = query(
      this.settingsCollection,
      where('category', '==', category),
      where('version', '==', version)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      throw new Error('Version not found');
    }

    const oldSettings = snapshot.docs[0].data();

    // Create new version with old settings
    await this.updateSettings({
      category,
      settings: oldSettings.settings
    });

    await this.logAudit('settings_rollback', category, { toVersion: version });

    return { rolledBack: true, version };
  }

  async logAudit(action, resourceId, metadata) {
    await addDoc(this.auditCollection, {
      timestamp: Date.now(),
      userId: this.adminId,
      action,
      resource: 'settings',
      resourceId,
      outcome: 'success',
      metadata,
      severity: 'high'
    });
  }
}

export default SystemSettingsService;
