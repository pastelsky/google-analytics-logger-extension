import ext from "./utils/ext";
import storage from "./utils/storage";
import cx from 'classnames'
import React, { Component } from "react"
import { render } from 'react-dom'
import Table from 'rc-table'

import ErrorIcon from 'react-icons/lib/md/error-outline'
import WarnIcon from 'react-icons/lib/md/warning'
import CopyIcon from 'react-icons/lib/md/content-copy'
import ClearIcon from 'react-icons/lib/md/do-not-disturb-alt'
import RedirectIcon from 'react-icons/lib/md/call-missed-outgoing'

import truncate from 'truncate-middle'
import CopyToClipboard from 'react-copy-to-clipboard';

const channel = ext.extension.connect({
  name: "Events",
});

const DetailsCell = ({ details }) => {
  const compacted = details.filter(d => d.value)
  return (
    <div className="details-cell">
      {
        compacted.map((detail) => (
          <div className="details-cell__division" key={ detail.title }>
            <div className="details-cell__title"> { detail.title } </div>
            <div className="details-cell__value"> { detail.value || '–' } </div>
          </div>
        ))
      }
    </div>
  )
}

const TypeBadge = ({ type }) => {
  const abbrs = {
    event: 'E',
    timing: 'T',
    exception: 'EX',
    social: 'S',
    pageview: 'P',
  }
  return (
    <div title={ type } className={ `type-badge type-badge--${type}` }>
      { abbrs[type] }
    </div>
  )
}

const EventsTable = ({ entries, entriesCount }) => {
  const getCleanURL = (url) => {
    const urlObj = new URL(url)
    const cleanURL = urlObj.hostname + urlObj.pathname + urlObj.search

    return cleanURL
  }

  const columns = [{
    title: '',
    key: 'icon',
    dataIndex: 'isSuccess',
    width: 10,
    render: (isSuccess, record, index) => {
      if (!isSuccess) {
        return (
          <div title={ record.error } className="event-status-icon">
            <ErrorIcon />
          </div>
        )
      } else if (isDuplicateEvent(index)) {
        return (
          <div title="Possibly a duplicate event" className="event-status-icon">
            <WarnIcon />
          </div>
        )
      }
    },
  }, {
    title: 'Type',
    key: 'type',
    dataIndex: 'type',
    className: 'type-column',
    render: (type, record) => (<TypeBadge type={ type } />),
    width: 10,
  }, {
    title: 'Details',
    key: 'details',
    width: 250,
    render: (_, record) => {
      switch (record.type) {
        case 'event':
          const eventDetails = [{
            title: 'Category',
            value: record.category,
          }, {
            title: 'Action',
            value: record.action,
          }, {
            title: 'Label',
            value: record.label,
          }, {
            title: 'Value',
            value: record.value,
          }]
          return (<DetailsCell details={ eventDetails } />)

        case 'pageview':
          const pageViewDetails = [{
            title: 'URL',
            value: (
              <a target="_blank"
                 href={ record.absoluteURL }
                 title={ record.absoluteURL }>
                { truncate(getCleanURL(record.absoluteURL), 20, 6, '...') }
              </a>
            ),
          }, {
            title: 'Title',
            value: (
              <span title={ record.title }>
                { truncate(record.title, 20, 6, '... ') }
              </span>
            ),
          }]
          return (<DetailsCell details={ pageViewDetails } />)

        case 'social':
          const socialDetails = [{
            title: 'Network',
            value: record.socialNetwork,
          }, {
            title: 'Action',
            value: record.socialAction,
          }, {
            title: 'Target',
            value: record.socialTarget,
          }]
          return (<DetailsCell details={ socialDetails } />)

        case 'timing':
          const timingDetails = [, {
            title: 'Category',
            value: record.userTimingCategory,
          }, {
            title: 'Variable',
            value: record.userTimingVariable,
          }, {
            title: 'Time',
            value: `${Number(record.userTimingValue).toLocaleString()}ms`,
          }]
          return (<DetailsCell details={ timingDetails } />)

        case 'exception':
          const exceptionDetails = [, {
            title: 'Description',
            value: record.exceptionDesc,
          }, {
            title: 'Fatal',
            value: record.exceptionFatal ? 'Yes' : 'No',
          }]
          return (<DetailsCell details={ exceptionDetails } />)
      }
    },
  }, {
    title: 'GA Account Id',
    key: 'uid',
    dataIndex: 'gaId',
    width: 50,
    render: (gaId, { gtmId }) => (
      <div className="ga-account-id">
        { gaId }
        {
          gtmId && (
            <div className="ga-account-id__subtext">
              <RedirectIcon /> { gtmId }
            </div>
          )
        }
      </div>
    ),
  },
    {
      title: 'Time',
      key: 'time',
      dataIndex: 'timestamp',
      width: 75,
      render: (timestamp) => {
        const time = new Date(parseInt(timestamp))
        return time.toLocaleString(navigator.language, {
          hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true,
        })
        return time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds()
      },
    },
  ]
  const getSeconds = (entry) => new Date(parseInt(entry.timestamp)).getSeconds()
  const getEventKey = (event) => getSeconds(event) +
    event.type + event.gaId + event.category + event.action + event.label + event.value

  const isDuplicateEvent = (index) => {
    if (index !== (entries.length - 1) &&
      getEventKey(entries[index]) === getEventKey(entries[index + 1])
    ) {
      return true
    } else if (
      index !== 0 &&
      getEventKey(entries[index]) === getEventKey(entries[index - 1])
    ) {
      return true
    }

    return false
  }
  const limitedEntries = entries.slice(-entriesCount)

  return (
    <Table
      emptyText="No Events"
      useFixedHeader={ false }
      //scroll={ { x: false, y: 400 } }
      className="events-table"
      columns={ columns }
      data={ limitedEntries }
      rowKey={ (record, index) => index }
      rowClassName={ (record, index) => cx(`row__type--${record.type}`, {
        'event--duplicate': isDuplicateEvent(index),
        'event--error': !record.isSuccess,
      })
      }
    />
  )
}

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      entries: [],
      entriesCount: 10,
    }
    this.tabId = null;

    this.handleClearClick = this.handleClearClick.bind(this)
    this.handleEntriesSelectChange = this.handleEntriesSelectChange.bind(this)
  }

  componentDidMount() {
    channel.postMessage({ type: "PULL_ENTRIES" })

    ext.tabs.query(
      { currentWindow: true, active: true },
      (tabs) => {
        this.tabId = tabs[0].id

        channel.onMessage.addListener((message) => {
          if (message.type === 'UPDATE_ENTRY') {
            this.setState({
              entries: message.entries.filter(e => e.tabId === this.tabId),
            }, this.recalcPopupSize)
          }
        });
      })

    storage.get('entriesCount', ({ entriesCount }) => {
      this.setState({ entriesCount })
    })

    this.recalcPopupSize()
  }

  handleClearClick() {
    channel.postMessage({ type: 'CLEAR_ENTRIES', tabId: this.tabId });
    this.setState({ entries: [] })
  }

  handleEntriesSelectChange(e) {
    const count = parseInt(e.target.value)
    this.setState({ entriesCount: count })
    storage.set({ entriesCount: count })

    this.recalcPopupSize()
  }

  recalcPopupSize() {
    // Workaround for jump due to late component mounting
    // https://bugs.chromium.org/p/chromium/issues/detail?id=428044
    setTimeout(() => {
      requestAnimationFrame(() => {
        const { width, height } = this.popup.getBoundingClientRect()
        document.body.style.width = `${width + 1}px`
        document.body.style.height = `${height + 1}px`
      })
    }, 100)
  }

  render() {
    const { entries, entriesCount } = this.state
    return (
      <div ref={ p => (this.popup = p) }>
        <EventsTable entries={ entries } entriesCount={ entriesCount } />
        <div className="toolbar">
          <div className="select-entries-container">
            Last
            <select
              value={ entriesCount }
              className="select-entries"
              onChange={ this.handleEntriesSelectChange }
            >
              {
                [10, 20, 35].map(count => (
                  <option value={ count } key={ count }>
                    { count }
                  </option>
                ))
              }
              <option value="1000">All</option>
            </select>
            events
          </div>
          <CopyToClipboard
            text={ JSON.stringify(this.state.entries.slice(-entriesCount), null, 2) }
          >
            <button className="icon-button" title="Copy as JSON">
              <CopyIcon />
              <label>
                Copy
              </label>
            </button>
          </CopyToClipboard>
          <button
            className="icon-button"
            title="Clear"
            onClick={ this.handleClearClick }
          >
            <ClearIcon />
            <label>
              Clear
            </label>
          </button>
        </div>
      </div>
    )
  }
}

render((
  <App />
), document.getElementById("app"));
