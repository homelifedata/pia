import { Injectable } from '@angular/core';

import { PiaService } from './pia.service';
import { Router } from '@angular/router';
import { Revision } from '../models/revision.model';
import { ApplicationDb } from '../application.db';

@Injectable()
export class RevisionService extends ApplicationDb {
  public revisionSelected: number;

  constructor(public piaService: PiaService, private router: Router) {
    super(201911191636, 'revision');
  }

  /**
   * Load a new revision
   */
  async loadRevision(revisionId): Promise<void> {
    return new Promise(resolve => {
      this.find(revisionId).then((revision: Revision) => {
        const piaExport = JSON.parse(revision.export);
        this.piaService.replacePiaByExport(piaExport, true, true, revision.created_at)
        .then((pia) => {
          resolve(piaExport);
        });
      });
    });
  }

  /**
   * Create new revision
   * @param piaExport - The PIA exported
   * @param piaId - The PIA id
   */
  async add(piaExport, piaId) {
    return new Promise((resolve, reject) => {
      const revision = new Revision();
      revision.pia_id = piaId;
      revision.export = piaExport;
      revision.create().then((response: any) => {
        resolve(response);
      });
    });
  }

  async export(id: number) {
    return new Promise(async (resolve, reject) => {
      await this.piaService.calculPiaProgress;
      this.piaService.exportData(id).then(data => {
        const finalData = JSON.stringify(data);
        resolve(finalData);
      });
    });
  }

  /**
   * Get the status of the PIA.
   * @returns {string} - Locale for translation.
   */
  getStatusName(status) {
    if (status >= 0) {
      return `pia.statuses.${status}`;
    }
  }

  /**
   * Get gauge name.
   * @param {*} value - The gauge value.
   * @returns {string} - Locale for translation.
   */
  getGaugeName(value: any) {
    if (value) {
      return `summary.gauges.${value}`;
    }
  }
}
