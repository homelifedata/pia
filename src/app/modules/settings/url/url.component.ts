import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DialogService } from 'src/app/services/dialog.service';
import { AuthService } from 'src/app/services/auth.service';
import { ApiService } from 'src/app/services/api.service';

@Component({
  selector: 'app-url',
  templateUrl: './url.component.html',
  styleUrls: ['./url.component.scss']
})
export class UrlComponent implements OnInit {
  settingsForm: FormGroup;
  loading = false;
  constructor(
    private fb: FormBuilder,
    private dialogService: DialogService,
    public authService: AuthService,
    public apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.settingsForm = this.fb.group({
      id: 1,
      server_url: ['', Validators.required],
      client_id: ['', Validators.required],
      client_secret: ['', Validators.required]
    });

    this.settingsForm.patchValue({
      server_url: localStorage.getItem('server_url'),
      client_id: localStorage.getItem('client_id')
        ? localStorage.getItem('client_id')
        : '',
      client_secret: localStorage.getItem('client_secret')
        ? localStorage.getItem('client_secret')
        : ''
    });
  }

  /**
   * Record the URL of the server.
   */
  onSubmit(): void {
    if (
      this.settingsForm.controls.server_url.value &&
      this.settingsForm.controls.server_url.value != ''
    ) {
      this.loading = true;
      const serverUrl = this.settingsForm.value.server_url.trim();
      fetch(serverUrl + '/info', {
        mode: 'cors'
      })
        .then(response => {
          return response.ok;
        })
        .then((ok: boolean) => {
          if (ok) {
            this.checkCredentials(
              this.settingsForm.value.client_id,
              this.settingsForm.value.client_secret
            )
              .then(() => {
                this.success(serverUrl);
              })
              .catch(err => {
                this.errorOnIntrospect();
              });
          } else {
            this.dialogService.confirmThis(
              {
                text: 'modals.update_server_url_nok.content',
                type: 'yes',
                yes: 'modals.close',
                no: '',
                icon: 'pia-icons pia-icon-sad'
              },
              () => {
                return;
              },
              () => {
                return;
              }
            );
          }
        })
        .catch(error => {
          console.error('Request failed', error);
          this.dialogService.confirmThis(
            {
              text: 'modals.update_server_url_nok.content',
              type: 'yes',
              yes: 'modals.close',
              no: '',
              icon: 'pia-icons pia-icon-sad'
            },
            () => {
              return;
            },
            () => {
              return;
            }
          );
        })
        .finally(() => {
          this.loading = false;
        });
    } else {
      /* Logout and reset authService */
      this.apiService.base = null;
      this.authService.logout();
      this.authService.state = false;
      localStorage.removeItem('server_url');
      this.dialogService.confirmThis(
        {
          text: 'modals.update_server_url_ok.content',
          type: 'yes',
          yes: 'modals.back_to_home',
          no: '',
          icon: 'pia-icons pia-icon-happy',
          data: {
            no_cross_button: true
          }
        },
        () => {
          window.location.href = './#/';
        },
        () => {
          return;
        }
      );
    }
  }

  purify(field, $event) {
    this.settingsForm.controls[field].patchValue(
      $event.target.value.replace(/\s/g, ''),
      { emitEvent: false }
    );
  }

  success(serverUrl) {
    localStorage.setItem('server_url', serverUrl);
    // TODO: Find another securely way
    localStorage.setItem('client_id', this.settingsForm.value.client_id);
    localStorage.setItem(
      'client_secret',
      this.settingsForm.value.client_secret
    );
    this.apiService.base = serverUrl;
    this.authService.state = true;
    this.dialogService.confirmThis(
      {
        text: 'modals.update_server_url_ok.content',
        type: 'yes',
        yes: 'modals.back_to_home',
        no: '',
        icon: 'pia-icons pia-icon-happy',
        data: {
          no_cross_button: true
        }
      },
      () => {
        if (this.authService.currentUserValue == null) {
          window.location.href = './#/';
        } else {
          window.location.href = './#/entries';
        }
      },
      () => {
        return;
      }
    );
  }

  errorOnIntrospect() {
    this.dialogService.confirmThis(
      {
        text: 'modals.update_server_url_nok.introspect',
        type: 'yes',
        yes: 'modals.back_to_home',
        no: '',
        icon: 'pia-icons pia-icon-sad',
        data: {}
      },
      () => {
        return;
      },
      () => {
        return;
      }
    );
  }

  checkCredentials(clientId, client_secret) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('client_id', clientId);
      formData.append('client_secret', client_secret);
      formData.append('token', '');
      this.apiService
        .post('/oauth/introspect', formData)
        .then((response: any) => {
          if (!response.error) {
            resolve(response);
          } else {
            reject(response);
          }
        })
        .catch(() => {
          reject('No introspect route');
        });
    });
  }
}
