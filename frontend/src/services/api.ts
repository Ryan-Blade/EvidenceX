const BASE_URL = '/api';

export const api = {
  async getDashboardStats() {
    const res = await fetch(`${BASE_URL}/dashboard/stats`);
    if (!res.ok) throw new Error('Failed to fetch dashboard stats');
    return res.json();
  },

  async getCases() {
    const res = await fetch(`${BASE_URL}/cases`);
    if (!res.ok) throw new Error('Failed to fetch cases');
    return res.json();
  },

  async getCase(caseId: string) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}`);
    if (!res.ok) throw new Error('Failed to fetch case details');
    return res.json();
  },

  async createCase(data: any) {
    const res = await fetch(`${BASE_URL}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create case');
    return res.json();
  },

  async updateCaseStatus(caseId: string, payload: { new_status: string; notes?: string; changed_by?: string }) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update case status');
    return res.json();
  },

  async seedDemoCase() {
    const res = await fetch(`${BASE_URL}/cases/seed-demo`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to seed demo case');
    return res.json();
  },

  async getEvidence(caseId: string) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/evidence`);
    if (!res.ok) throw new Error('Failed to fetch evidence');
    return res.json();
  },

  async uploadEvidenceFile(caseId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/cases/${caseId}/evidence/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async uploadBatchEvidenceFiles(caseId: string, files: File[]) {
    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    const res = await fetch(`${BASE_URL}/cases/${caseId}/evidence/upload-batch`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Batch upload failed' }));
      throw new Error(err.detail || 'Batch upload failed');
    }
    return res.json();
  },

  async pasteTextEvidence(caseId: string, title: string, text_content: string) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/evidence/paste-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, text_content })
    });
    if (!res.ok) throw new Error('Failed to paste text evidence');
    return res.json();
  },

  async ingestUrlEvidence(caseId: string, url: string) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/evidence/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    if (!res.ok) throw new Error('Failed to ingest URL');
    return res.json();
  },

  async addManualTransaction(caseId: string, data: any) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/evidence/manual-transaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to add manual transaction');
    return res.json();
  },

  async getEntities(caseId: string) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/entities`);
    if (!res.ok) throw new Error('Failed to fetch entities');
    return res.json();
  },

  async revealPII(caseId: string, payload: { entity_type: string; entity_id?: number; masked_value: string; reason: string }) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/entities/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Reveal failed' }));
      throw new Error(err.detail || 'Reveal failed');
    }
    return res.json();
  },

  async getTransactions(caseId: string) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/transactions`);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },

  async getTimeline(caseId: string) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/timeline`);
    if (!res.ok) throw new Error('Failed to fetch timeline');
    return res.json();
  },

  async getConflicts(caseId: string) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/conflicts`);
    if (!res.ok) throw new Error('Failed to fetch conflicts');
    return res.json();
  },

  async reviewConflict(caseId: string, conflictId: number, is_reviewed: boolean, review_notes?: string) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/conflicts/${conflictId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_reviewed, review_notes })
    });
    if (!res.ok) throw new Error('Failed to update conflict');
    return res.json();
  },

  async getMissingInfo(caseId: string) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/missing-info`);
    if (!res.ok) throw new Error('Failed to fetch missing info');
    return res.json();
  },

  async getStructuralFlags(caseId: string) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/structural-flags`);
    if (!res.ok) throw new Error('Failed to fetch structural flags');
    return res.json();
  },

  async getFraudPattern(caseId: string) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/fraud-pattern`);
    if (!res.ok) throw new Error('Failed to fetch fraud pattern');
    return res.json();
  },

  async getFingerprints(caseId: string) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/fingerprint`);
    if (!res.ok) throw new Error('Failed to fetch fingerprints');
    return res.json();
  },

  async getThreatIntel(caseId: string) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/threat-intel`);
    if (!res.ok) throw new Error('Failed to fetch threat intel');
    return res.json();
  },

  async getSummary(caseId: string) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/summary`);
    if (!res.ok) throw new Error('Failed to fetch summary');
    return res.json();
  },

  async updateSummaryNotes(caseId: string, notes: string) {
    const res = await fetch(`${BASE_URL}/cases/${caseId}/summary/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ investigator_notes: notes })
    });
    if (!res.ok) throw new Error('Failed to update summary notes');
    return res.json();
  },

  async searchGlobal(query: string) {
    const res = await fetch(`${BASE_URL}/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  },

  async getAuditLogs() {
    const res = await fetch(`${BASE_URL}/settings/audit-logs`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  async getSettingsConfig() {
    const res = await fetch(`${BASE_URL}/settings/config`);
    if (!res.ok) throw new Error('Failed to fetch settings config');
    return res.json();
  },

  async updateSettingsConfig(payload: { ai_provider: string; api_key?: string }) {
    const res = await fetch(`${BASE_URL}/settings/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update config' }));
      throw new Error(err.detail || 'Failed to update config');
    }
    return res.json();
  }
};

