import { db, storage } from '../firebase.config';
import { collection, addDoc, updateDoc, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Verification Service (UC38) - Verify improvements
 */
export class VerificationService {
  constructor(userId) {
    this.userId = userId;
    this.verificationsCollection = collection(db, 'verifications');
  }

  /**
   * Submit report for verification
   */
  async submitForVerification(submissionData) {
    const {
      reportId,
      evidence = [],
      notes = ''
    } = submissionData;

    // Upload evidence files
    const uploadedEvidence = await this.uploadEvidence(evidence);

    const verification = {
      reportId,
      userId: this.userId,
      officerId: null,
      status: 'pending',
      evidence: uploadedEvidence,
      calculations: {
        verified: false,
        notes: ''
      },
      decision: {
        approved: false,
        notes: '',
        conditions: []
      },
      auditLog: [{
        action: 'submitted',
        timestamp: Date.now(),
        userId: this.userId,
        notes
      }],
      createdAt: Date.now(),
      completedAt: null
    };

    const docRef = await addDoc(this.verificationsCollection, verification);

    // Update report status
    const reportRef = doc(db, 'impact_reports', reportId);
    await updateDoc(reportRef, {
      status: 'pending_verification',
      verificationId: docRef.id
    });

    return {
      id: docRef.id,
      ...verification
    };
  }

  /**
   * Upload evidence files
   */
  async uploadEvidence(evidenceFiles) {
    const uploaded = [];

    for (const file of evidenceFiles) {
      const fileName = `verification/${this.userId}/${Date.now()}_${file.name || 'evidence'}`;
      const storageRef = ref(storage, fileName);

      try {
        let blob;
        if (file.uri || file.url) {
          const response = await fetch(file.uri || file.url);
          blob = await response.blob();
        } else if (file instanceof Blob) {
          blob = file;
        } else {
          continue;
        }

        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);

        uploaded.push({
          type: file.type || 'photo',
          url,
          description: file.description || '',
          uploadedAt: Date.now()
        });
      } catch (error) {
        console.error('Evidence upload failed:', error);
      }
    }

    return uploaded;
  }

  /**
   * Review verification (Officer action)
   */
  async reviewVerification(reviewData) {
    const {
      verificationId,
      approved,
      notes = '',
      conditions = [],
      calculationNotes = ''
    } = reviewData;

    const verificationRef = doc(db, 'verifications', verificationId);
    const verificationDoc = await getDoc(verificationRef);

    if (!verificationDoc.exists()) {
      throw new Error('Verification not found');
    }

    const verification = verificationDoc.data();

    // Verify calculations
    const calculationsVerified = await this.verifyCalculations(verification.reportId);

    // Update verification
    const updates = {
      officerId: this.userId,
      status: approved ? 'approved' : 'rejected',
      calculations: {
        verified: calculationsVerified,
        notes: calculationNotes
      },
      decision: {
        approved,
        notes,
        conditions
      },
      completedAt: Date.now()
    };

    // Add to audit log
    verification.auditLog.push({
      action: approved ? 'approved' : 'rejected',
      timestamp: Date.now(),
      userId: this.userId,
      notes
    });

    updates.auditLog = verification.auditLog;

    await updateDoc(verificationRef, updates);

    // Update report status
    const reportRef = doc(db, 'impact_reports', verification.reportId);
    await updateDoc(reportRef, {
      status: approved ? 'verified' : 'rejected'
    });

    return {
      id: verificationId,
      ...verification,
      ...updates
    };
  }

  /**
   * Verify calculations
   */
  async verifyCalculations(reportId) {
    const reportDoc = await getDoc(doc(db, 'impact_reports', reportId));
    
    if (!reportDoc.exists()) {
      return false;
    }

    const report = reportDoc.data();
    const metrics = report.metrics;

    // Verify yield calculations
    const yieldValid = this.verifyYieldCalculations(metrics.yield);

    // Verify water calculations
    const waterValid = this.verifyWaterCalculations(metrics.water);

    // Verify cost calculations
    const costValid = this.verifyCostCalculations(metrics.cost);

    // All must be valid
    return yieldValid && waterValid && costValid;
  }

  /**
   * Verify yield calculations
   */
  verifyYieldCalculations(yieldMetrics) {
    if (!yieldMetrics.baseline || yieldMetrics.baseline === 0) {
      return false;
    }

    const calculatedImprovement = yieldMetrics.current - yieldMetrics.baseline;
    const calculatedPercentage = (calculatedImprovement / yieldMetrics.baseline) * 100;

    // Allow 1% tolerance
    const improvementMatch = Math.abs(calculatedImprovement - yieldMetrics.improvement) < 1;
    const percentageMatch = Math.abs(calculatedPercentage - yieldMetrics.percentage) < 1;

    return improvementMatch && percentageMatch;
  }

  /**
   * Verify water calculations
   */
  verifyWaterCalculations(waterMetrics) {
    if (!waterMetrics.baseline || waterMetrics.baseline === 0) {
      return false;
    }

    const calculatedSavings = waterMetrics.baseline - waterMetrics.current;
    const calculatedPercentage = (calculatedSavings / waterMetrics.baseline) * 100;

    const savingsMatch = Math.abs(calculatedSavings - waterMetrics.savings) < 1;
    const percentageMatch = Math.abs(calculatedPercentage - waterMetrics.percentage) < 1;

    return savingsMatch && percentageMatch;
  }

  /**
   * Verify cost calculations
   */
  verifyCostCalculations(costMetrics) {
    if (!costMetrics.baseline || costMetrics.baseline === 0) {
      return false;
    }

    const calculatedReduction = costMetrics.baseline - costMetrics.current;
    const calculatedPercentage = (calculatedReduction / costMetrics.baseline) * 100;

    const reductionMatch = Math.abs(calculatedReduction - costMetrics.reduction) < 0.01;
    const percentageMatch = Math.abs(calculatedPercentage - costMetrics.percentage) < 1;

    return reductionMatch && percentageMatch;
  }

  /**
   * Request additional evidence
   */
  async requestAdditionalEvidence(verificationId, request) {
    const verificationRef = doc(db, 'verifications', verificationId);
    const verificationDoc = await getDoc(verificationRef);

    if (!verificationDoc.exists()) {
      throw new Error('Verification not found');
    }

    const verification = verificationDoc.data();

    // Add to audit log
    verification.auditLog.push({
      action: 'evidence_requested',
      timestamp: Date.now(),
      userId: this.userId,
      notes: request
    });

    await updateDoc(verificationRef, {
      status: 'evidence_requested',
      auditLog: verification.auditLog
    });

    return {
      id: verificationId,
      status: 'evidence_requested',
      request
    };
  }

  /**
   * Add additional evidence
   */
  async addAdditionalEvidence(verificationId, evidence) {
    const verificationRef = doc(db, 'verifications', verificationId);
    const verificationDoc = await getDoc(verificationRef);

    if (!verificationDoc.exists()) {
      throw new Error('Verification not found');
    }

    const verification = verificationDoc.data();

    // Upload new evidence
    const uploadedEvidence = await this.uploadEvidence(evidence);

    // Add to existing evidence
    const allEvidence = [...verification.evidence, ...uploadedEvidence];

    // Add to audit log
    verification.auditLog.push({
      action: 'evidence_added',
      timestamp: Date.now(),
      userId: this.userId,
      notes: `Added ${uploadedEvidence.length} evidence items`
    });

    await updateDoc(verificationRef, {
      evidence: allEvidence,
      status: 'pending',
      auditLog: verification.auditLog
    });

    return {
      id: verificationId,
      evidence: allEvidence
    };
  }

  /**
   * Get pending verifications (Officer view)
   */
  async getPendingVerifications() {
    const q = query(
      this.verificationsCollection,
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);
    const verifications = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      // Get report details
      const reportDoc = await getDoc(doc(db, 'impact_reports', data.reportId));
      const report = reportDoc.data();

      // Get user details
      const userDoc = await getDoc(doc(db, 'users', data.userId));
      const user = userDoc.data();

      verifications.push({
        id: docSnap.id,
        ...data,
        report: {
          id: data.reportId,
          title: report?.title,
          metrics: report?.metrics
        },
        user: {
          id: data.userId,
          name: user?.name,
          email: user?.email
        }
      });
    }

    return verifications;
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(verificationId) {
    const verificationDoc = await getDoc(doc(db, 'verifications', verificationId));
    
    if (!verificationDoc.exists()) {
      throw new Error('Verification not found');
    }

    return {
      id: verificationId,
      ...verificationDoc.data()
    };
  }

  /**
   * Get user's verifications
   */
  async getUserVerifications() {
    const q = query(
      this.verificationsCollection,
      where('userId', '==', this.userId)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
}

export default VerificationService;
