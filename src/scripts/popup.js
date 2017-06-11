import ext from "./utils/ext";
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

const EventsTable = ({ entries }) => {
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
    width: 15,
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
    event.gaId + event.category + event.action + event.label + event.value

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
  return (
    <Table
      emptyText="No Events"
      useFixedHeader={ false }
      //scroll={ { x: false, y: 400 } }
      className="events-table"
      columns={ columns }
      data={ entries }
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
    }
    this.tabId = null;

    this.handleClearClick = this.handleClearClick.bind(this)
  }

  componentDidMount() {
    ext.tabs.query(
      { currentWindow: true, active: true },
      (tabs) => {
        this.tabId = tabs[0].id
        ext.runtime.sendMessage({ type: 'PULL_ENTRIES' })

        ext.runtime
          .onMessage
          .addListener((message) => {
            if (message.type === 'UPDATE_ENTRY')
              this.setState({
                entries: message.entries.filter(
                  e => e.tabId === this.tabId),
              })
          })
      })
  }

  handleClearClick() {
    ext.runtime.sendMessage({ type: 'CLEAR_ENTRIES', tabId: this.tabId })
    this.setState({ entries: [] })
  }

  render() {
    const { entries } = this.state
    return (
      <div>
        <EventsTable entries={ entries } />
        <div className="toolbar">
          <CopyToClipboard text={ JSON.stringify(this.state.entries, null, 2) }>
            <button className="icon-button" title="Copy as JSON">
              <CopyIcon />
              <label>
                Copy
              </label>
            </button>
          </CopyToClipboard>
          <button className="icon-button" title="Clear" onClick={ this.handleClearClick }>
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
