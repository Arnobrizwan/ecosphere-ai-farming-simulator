import { db } from '../firebase.config';
import { collection, addDoc, updateDoc, query, where, getDocs, doc } from 'firebase/firestore';

/**
 * User Management Service (UCA1) - Manage users & roles
 */
export class UserManagementService {
  constructor(adminId) {
    this.adminId = adminId;
    this.usersCollection = collection(db, 'users');
    this.rolesCollection = collection(db, 'roles');
    this.auditCollection = collection(db, 'audit_events');
  }

  async createUser(userData) {
    const user = {
      email: userData.email,
      name: userData.name,
      role: userData.role || 'farmer',
      permissions: userData.permissions || [],
      status: 'active',
      mfaEnabled: false,
      lastLogin: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: userData.metadata || {}
    };

    const docRef = await addDoc(this.usersCollection, user);

    await this.logAudit('user_created', docRef.id, user);

    return { id: docRef.id, ...user };
  }

  async assignRole(userId, role) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role,
      updatedAt: Date.now()
    });

    await this.logAudit('role_assigned', userId, { role });

    return { userId, role };
  }

  async updatePermissions(userId, permissions) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      permissions,
      updatedAt: Date.now()
    });

    await this.logAudit('permissions_updated', userId, { permissions });

    return { userId, permissions };
  }

  async suspendUser(userId, reason) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status: 'suspended',
      suspendedReason: reason,
      suspendedAt: Date.now(),
      updatedAt: Date.now()
    });

    await this.logAudit('user_suspended', userId, { reason });

    return { suspended: true, userId };
  }

  async enableUser(userId) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status: 'active',
      updatedAt: Date.now()
    });

    await this.logAudit('user_enabled', userId, {});

    return { enabled: true, userId };
  }

  async resetMFA(userId) {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      mfaEnabled: false,
      mfaSecret: null,
      updatedAt: Date.now()
    });

    await this.logAudit('mfa_reset', userId, {});

    return { reset: true, userId };
  }

  async resetPassword(userId) {
    // Would integrate with auth system
    await this.logAudit('password_reset', userId, {});

    return { reset: true, userId };
  }

  async bulkImport(csvData) {
    const users = this.parseCSV(csvData);
    const results = [];

    for (const userData of users) {
      try {
        const user = await this.createUser(userData);
        results.push({ success: true, user });
      } catch (error) {
        results.push({ success: false, error: error.message, data: userData });
      }
    }

    await this.logAudit('bulk_import', 'multiple', { count: users.length });

    return results;
  }

  parseCSV(csvData) {
    // Simple CSV parser
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const user = {};
      headers.forEach((header, i) => {
        user[header.trim()] = values[i]?.trim();
      });
      return user;
    });
  }

  async searchUsers(filters = {}) {
    let q = query(this.usersCollection);

    if (filters.role) {
      q = query(q, where('role', '==', filters.role));
    }

    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getUserStats() {
    const users = await this.searchUsers();

    return {
      total: users.length,
      byRole: this.groupBy(users, 'role'),
      byStatus: this.groupBy(users, 'status'),
      active: users.filter(u => u.status === 'active').length
    };
  }

  groupBy(array, key) {
    return array.reduce((result, item) => {
      (result[item[key]] = result[item[key]] || []).push(item);
      return result;
    }, {});
  }

  async logAudit(action, resourceId, metadata) {
    await addDoc(this.auditCollection, {
      timestamp: Date.now(),
      userId: this.adminId,
      action,
      resource: 'user',
      resourceId,
      outcome: 'success',
      metadata,
      severity: 'medium'
    });
  }
}

export default UserManagementService;
