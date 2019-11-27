import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { Actions } from '@ngrx/effects';
import { faHistory } from '@fortawesome/free-solid-svg-icons';

import { MatTableDataSource, MatSort, MatPaginator, MatPaginatorIntl } from '@angular/material';
import { ClosedChannel } from '../../../../../shared/models/lndModels';
import { PAGE_SIZE, PAGE_SIZE_OPTIONS, getPaginatorLabel, AlertTypeEnum } from '../../../../../shared/services/consts-enums-functions';
import { LoggerService } from '../../../../../shared/services/logger.service';

import { RTLEffects } from '../../../../../store/rtl.effects';
import * as RTLActions from '../../../../../store/rtl.actions';
import * as fromRTLReducer from '../../../../../store/rtl.reducers';

@Component({
  selector: 'rtl-channel-closed-table',
  templateUrl: './channel-closed-table.component.html',
  styleUrls: ['./channel-closed-table.component.scss'],
  providers: [
    { provide: MatPaginatorIntl, useValue: getPaginatorLabel('Channels') }
  ]
})
export class ChannelClosedTableComponent implements OnInit, OnDestroy {
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;
  faHistory = faHistory;
  public displayedColumns = [];
  public closedChannels: any;
  public flgLoading: Array<Boolean | 'error'> = [true];
  public selectedFilter = '';
  public flgSticky = false;
  public pageSize = PAGE_SIZE;
  public pageSizeOptions = PAGE_SIZE_OPTIONS;
  private unsub: Array<Subject<void>> = [new Subject(), new Subject(), new Subject()];

  constructor(private logger: LoggerService, private store: Store<fromRTLReducer.RTLState>, private rtlEffects: RTLEffects, private actions$: Actions) {
    switch (true) {
      case (window.innerWidth <= 415):
        this.displayedColumns = ['close_type', 'chan_id', 'actions'];
        break;
      case (window.innerWidth > 415 && window.innerWidth <= 730):
        this.displayedColumns = ['close_type', 'chan_id', 'close_height', 'settled_balance', 'actions'];
        break;
      case (window.innerWidth > 730 && window.innerWidth <= 1024):
        this.displayedColumns = ['close_type', 'chan_id', 'capacity', 'close_height', 'settled_balance', 'actions'];
        break;
      case (window.innerWidth > 1024 && window.innerWidth <= 1280):
        this.flgSticky = true;
        this.displayedColumns = ['close_type', 'chan_id', 'capacity', 'close_height', 'settled_balance', 'actions'];
        break;
      default:
        this.flgSticky = true;
        this.displayedColumns = ['close_type', 'chan_id', 'capacity', 'close_height', 'settled_balance', 'actions'];
        break;
    }
  }

  ngOnInit() {
    this.store.dispatch(new RTLActions.FetchChannels({routeParam: 'closed'}));
    this.actions$.pipe(takeUntil(this.unsub[2]), filter((action) => action.type === RTLActions.RESET_LND_STORE)).subscribe((resetLndStore: RTLActions.ResetLNDStore) => {
      this.store.dispatch(new RTLActions.FetchChannels({routeParam: 'closed'}));
    });
    this.store.select('lnd')
    .pipe(takeUntil(this.unsub[0]))
    .subscribe((rtlStore) => {
      rtlStore.effectErrorsLnd.forEach(effectsErr => {
        if (effectsErr.action === 'FetchChannels/closed') {
          this.flgLoading[0] = 'error';
        }
      });
      if (undefined !== rtlStore.closedChannels) {
        this.loadClosedChannelsTable(rtlStore.closedChannels);
      }
      if (this.flgLoading[0] !== 'error') {
        this.flgLoading[0] = (undefined !== rtlStore.closedChannels) ? false : true;
      }
      this.logger.info(rtlStore);
    });

  }

  applyFilter(selFilter: string) {
    this.selectedFilter = selFilter;
    this.closedChannels.filter = selFilter;
  }

  onClosedChannelClick(selRow: ClosedChannel, event: any) {
    const selChannel = this.closedChannels.data.filter(closedChannel => {
      return closedChannel.chan_id === selRow.chan_id;
    })[0];
    const reorderedChannel = JSON.parse(JSON.stringify(selChannel, ['close_type', 'channel_point', 'chan_id', 'closing_tx_hash', 'remote_pubkey', 'capacity',
    'close_height', 'settled_balance', 'time_locked_balance'] , 2));
    this.store.dispatch(new RTLActions.OpenAlert({ width: '75%', data: {
      type: AlertTypeEnum.INFORMATION,
      alertTitle: 'Closed Channel Information',
      message: JSON.stringify(reorderedChannel)
    }}));
  }

  loadClosedChannelsTable(closedChannels) {
    this.closedChannels = new MatTableDataSource<ClosedChannel>([...closedChannels]);
    this.closedChannels.sort = this.sort;
    this.closedChannels.paginator = this.paginator;
    this.logger.info(this.closedChannels);
  }

  resetData() {
    this.selectedFilter = '';
  }

  ngOnDestroy() {
    this.unsub.forEach(completeSub => {
      completeSub.next();
      completeSub.complete();
    });
  }

}
