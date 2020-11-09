import { Component, ElementRef, OnInit, AfterViewChecked, Input, Output, EventEmitter } from '@angular/core';
import { PiaService } from 'src/app/services/pia.service';
import { AppDataService } from 'src/app/services/app-data.service';
import { TranslateService } from '@ngx-translate/core';
import { RevisionService } from 'src/app/services/revision.service';
import { LanguagesService } from 'src/app/services/languages.service';
import { Answer } from 'src/app/models/answer.model';
import { Evaluation } from 'src/app/models/evaluation.model';
import { Measure } from 'src/app/models/measure.model';
import { Revision } from 'src/app/models/revision.model';
import { ActionPlanService } from 'src/app/services/action-plan.service';
import { AnswerService } from 'src/app/services/answer.service';

@Component({
  selector: 'app-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss'],
})
export class PreviewComponent implements OnInit, AfterViewChecked {
  public activeElement: string;
  data: { sections: any };
  content: any[];
  dataNav: any;
  @Input() pia: any;
  allData: object;
  fromArchives = false;
  @Input() onlyData = false;
  public revisions = null;
  public revisionOverlay = false;

  constructor(
    public actionPlanService: ActionPlanService,
    private translateService: TranslateService,
    public piaService: PiaService,
    private appDataService: AppDataService,
    public revisionService: RevisionService,
    public languagesService: LanguagesService,
    private answerService: AnswerService
  ) {}

  ngOnInit(): void {
    this.content = [];
    this.dataNav = this.appDataService.dataNav;

    this.showPia();

    if (this.pia.is_archive === 1) {
      this.fromArchives = true;
    }

    // Load PIA's revisions
    const revision = new Revision();
    revision.findAllByPia(this.pia.id).then(resp => {
      this.revisions = resp;
    });

    if (this.pia.structure_data) {
      this.appDataService.dataNav = this.pia.structure_data;
    }
    this.data = this.appDataService.dataNav;
  }

  ngAfterViewChecked(): void {
    // scroll spy
    const sections = document.querySelectorAll('.pia-fullPreviewBlock-headline-title h2') as NodeListOf<HTMLElement>;
    const menus = document.querySelectorAll('.pia-sectionBlock-body li a') as NodeListOf<HTMLElement>;
    window.onscroll = () => {
      const scrollPosition = document.documentElement.scrollTop || document.body.scrollTop;
      sections.forEach(s => {
        if (s.offsetTop < scrollPosition + 100) {
          menus.forEach(l => {
            l.classList.remove('active');
            if (l.innerText === s.innerText) {
              l.setAttribute('class', 'active');
            }
          });
        }
      });
    };
  }

  /**
   * Jump to the title/subtitle clicked.
   * @param {any} event - Any Event.
   * @param {any} text - The title or subtitle.
   */
  getAnchor(event, text): void {
    event.preventDefault();
    const allSubtitles = document.querySelectorAll('h2');
    allSubtitles.forEach.call(allSubtitles, (el, i) => {
      if (el.innerText === this.translateService.instant(text)) {
        el.parentNode.scrollIntoView({ behavior: 'instant' });
      }
    });
  }

  /**
   * Prepare and display the PIA information
   */
  async showPia(): Promise<void> {
    this.prepareDpoData();
    this.actionPlanService.data = this.dataNav;
    this.actionPlanService.pia = this.pia;
    this.actionPlanService.listActionPlan();
    this.getJsonInfo();
  }

  /**
   * Get PIA information.
   * @private
   */
  private prepareDpoData(): void {
    const el = { title: 'summary.title', data: [] };
    if (this.pia.dpos_names && this.pia.dpos_names.length > 0) {
      el.data.push({
        title: 'summary.dpo_name',
        content: this.pia.dpos_names
      });
    }
    if (this.pia.dpo_status && this.pia.dpo_status.length > 0) {
      el.data.push({
        title: 'summary.dpo_status',
        content: this.pia.getOpinionsStatus(this.pia.dpo_status.toString())
      });
    }
    if (this.pia.dpo_opinion && this.pia.dpo_opinion.length > 0) {
      el.data.push({
        title: 'summary.dpo_opinion',
        content: this.pia.dpo_opinion
      });
    }

    // Searched opinion for concerned people
    if (this.pia.concerned_people_searched_opinion === true) {
      el.data.push({
        title: 'summary.concerned_people_searched_opinion',
        content: this.pia.getPeopleSearchStatus(this.pia.concerned_people_searched_opinion)
      });
      if (this.pia.people_names && this.pia.people_names.length > 0) {
        el.data.push({
          title: 'summary.concerned_people_name',
          content: this.pia.people_names
        });
      }
      if (this.pia.concerned_people_status >= 0) {
        el.data.push({
          title: 'summary.concerned_people_status',
          content: this.pia.getOpinionsStatus(this.pia.concerned_people_status.toString())
        });
      }
      if (this.pia.concerned_people_opinion && this.pia.concerned_people_opinion.length > 0) {
        el.data.push({
          title: 'summary.concerned_people_opinion',
          content: this.pia.concerned_people_opinion
        });
      }
    }

    // Unsearched opinion for concerned people
    if (this.pia.concerned_people_searched_opinion === false) {
      el.data.push({
        title: 'summary.concerned_people_searched_opinion',
        content: this.pia.getPeopleSearchStatus(this.pia.concerned_people_searched_opinion)
      });
      if (this.pia.concerned_people_searched_content && this.pia.concerned_people_searched_content.length > 0) {
        el.data.push({
          title: 'summary.concerned_people_unsearched_opinion_comment',
          content: this.pia.concerned_people_searched_content
        });
      }
    }

    if (this.pia.applied_adjustements && this.pia.applied_adjustements.length > 0) {
      el.data.push({
        title: 'summary.modification_made',
        content: this.pia.applied_adjustements
      });
    }
    if (this.pia.rejected_reason && this.pia.rejected_reason.length > 0) {
      el.data.push({
        title: 'summary.rejection_reason',
        content: this.pia.rejected_reason
      });
    }

    this.content.push(el);
  }

  /**
   * Get information from the JSON file.
   * @returns {Promise}
   * @private
   */
  private async getJsonInfo(): Promise<void> {
    this.allData = {};
    this.piaService.data.sections.forEach(async section => {
      this.allData[section.id] = {};
      section.items.forEach(async item => {
        this.allData[section.id][item.id] = {};
        const ref = section.id.toString() + '.' + item.id.toString();

        // Measure
        if (item.is_measure) {
          this.allData[section.id][item.id] = [];
          const measuresModel = new Measure();
          measuresModel.pia_id = this.pia.id;
          const entries: any = await measuresModel.findAll();
          entries.forEach(async measure => {
            /* Completed measures */
            if (measure.title !== undefined && measure.content !== undefined) {
              let evaluation = null;
              if (item.evaluation_mode === 'question') {
                evaluation = await this.getEvaluation(section.id, item.id, ref + '.' + measure.id);
              }
              this.allData[section.id][item.id].push({
                title: measure.title,
                content: measure.content,
                evaluation
              });
            }
          });
        } else if (item.questions) {
          // Question
          item.questions.forEach(async question => {
            this.allData[section.id][item.id][question.id] = {};
            this.answerService.getByReferenceAndPia(this.pia.id, question.id)
              .then((answer: Answer) => {
                /* An answer exists */
                if (answer && answer.data) {
                  const content = [];
                  if (answer.data.gauge && answer.data.gauge > 0) {
                    content.push(this.translateService.instant(this.pia.getGaugeName(answer.data.gauge)));
                  }
                  if (answer.data.text && answer.data.text.length > 0) {
                    content.push(answer.data.text);
                  }
                  if (answer.data.list && answer.data.list.length > 0) {
                    content.push(answer.data.list.join(', '));
                  }
                  if (content.length > 0) {
                    if (item.evaluation_mode === 'question') {
                      this.getEvaluation(section.id, item.id, ref + '.' + question.id).then(evaluation => {
                        this.allData[section.id][item.id][question.id].evaluation = evaluation;
                      });
                    }
                    this.allData[section.id][item.id][question.id].content = content.join(', ');
                  }
                }
              });
          });
        }
        if (item.evaluation_mode === 'item') {
          const evaluation = await this.getEvaluation(section.id, item.id, ref);
          this.allData[section.id][item.id]['evaluation_item'] = evaluation;
        }
      });
    });
  }

  /**
   * Get an evaluation by reference.
   * @private
   * @param {string} section_id - The section id.
   * @param {string} item_id - The item id.
   * @param {string} ref - The reference.
   * @returns {Promise}
   */
  private async getEvaluation(section_id: string, item_id: string, ref: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      let evaluation = null;
      const evaluationModel = new Evaluation();
      const exist = await evaluationModel.getByReference(this.pia.id, ref);
      if (exist) {
        evaluation = {
          title: evaluationModel.getStatusName(),
          action_plan_comment: evaluationModel.action_plan_comment,
          evaluation_comment: evaluationModel.evaluation_comment,
          gauges: {
            riskName: {
              value: this.translateService.instant('sections.' + section_id + '.items.' + item_id + '.title')
            },
            seriousness: evaluationModel.gauges ? evaluationModel.gauges.x : null,
            likelihood: evaluationModel.gauges ? evaluationModel.gauges.y : null
          }
        };
      }
      resolve(evaluation);
    });
  }
}
