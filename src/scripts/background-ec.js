import ext from "./utils/ext"
import queryString from 'query-string'

let entries = []

function parseProductImpressions(impressionObject) {
  let hasMoreProducts = true
  let c = 1
  const products = []
  while (hasMoreProducts) {
    if (impressionObject[`il1pi${c}nm`] || impressionObject[`il1${c}id`]) {
      products.push({
        name: impressionObject[`il1pi${c}nm`],
        id: impressionObject[`il1pi${c}id`],
        price: impressionObject[`il1pi${c}pr`],
        brand: impressionObject[`il1pi${c}br`],
        position: impressionObject[`il1pi${c}ps`],
        variant: impressionObject[`il1pi${c}va`],
        category: impressionObject[`il1pi${c}ca`],
      })
      c++
    } else {
      hasMoreProducts = false
    }
  }

  return products
}

class LiveQueue {
  constructor() {
    this.queue = []
    this.isProcessing = false
  }

  push(executor) {
    console.log('pushed item no. ', this.queue.length)
    this.queue.push(executor)
    if (!this.isProcessing) {
      console.log('process not started. starting processing...')
      this.processQueue()
    }
  }

  processQueue() {
    if (this.queue.length) {
      console.log('processing item 0')
      this.isProcessing = true
      const executor = this.queue[0]
      new Promise(executor)
        .then(() => {
          this.queue.shift()
          console.log('processin item fin. looking for next in remaining', this.queue.length, 'items')
          this.processQueue()
        })
    } else {
      console.log('processing fin')
      this.isProcessing = false
    }
  }
}

const storageQueue = new LiveQueue()

function parseClassicGAEventString(eventString) {
  let data = {
    category: null,
    action: null,
    value: null,
    label: null,
  }
  if (eventString.substr(0, 1) === '5') {
    if (eventString.includes(')8(')) eventString = eventString.substring(0, eventString.indexOf(')8(') + 1);
    if (eventString.includes(')9(')) eventString = eventString.substring(0, eventString.indexOf(')9(') + 1);
    if (eventString.includes(')11(')) eventString = eventString.substring(0, eventString.indexOf(')11(') + 1);
    eventString = eventString.substring(2, eventString.length - 1)
      .split(/\*|\)\(/);
    data.category = eventString[0];
    data.action = eventString[1];
    if (eventString.length > 2) {
      data.label = eventString[2];
      if (eventString.length > 3) {
        data.value = eventString[3];
      }
    }
  }

  return data
}
function processURL(req, isSuccess, isPost = false) {
  const params = queryString.parse(req.url)
  const isClassicGA = req.url.includes('__utm.gif')
  let data, classicGAData = {}

  if (isClassicGA) {
    classicGAData = parseClassicGAEventString(params.utme)
  }
  const commonData = {
    isClassic: isClassicGA,
    timestamp: params._utmht || params.utmht || Date.now(),
    isSuccess: isSuccess,
    action: params.ea || classicGAData.action,
    category: params.ec || classicGAData.category,
    label: params.el || classicGAData.label,
    value: params.ev || classicGAData.value,
    gaId: params.tid || params.utmac,
    id: params.z || params.utmhid,
    absoluteURL: params.dl,
    error: req.error,
    type: params.t || params.utmt,
    title: params.dt || params.utmdt,
    gtmId: params.gtm || params.utmgtm,
    tabId: req.tabId,
  }

  switch (params.t) {
    case 'timing':
      data = {
        ...commonData,
        userTimingCategory: params.utc,
        userTimingValue: params.utt,
        userTimingVariable: params.utv,
      }
      break;

    case 'social':
      data = {
        ...commonData,
        socialNetwork: params.sn,
        socialAction: params.sa,
        socialTarget: params.st,
      }
      break;

    case 'exception' :
      data = {
        ...commonData,
        exceptionDesc: params.exd,
        exceptionFatal: params.exf,
      }
      break;

    case 'pageview' : {
      data = {
        ...commonData,
        relativeURL: params.dp || params.utmp,
      }
    }
      break;

    case 'event':
    default:
      data = {
        ...commonData
      }
      break;
  }

  if (isPost) {
    const bodyString = new TextDecoder('utf-8').decode(req.requestBody.raw[0].bytes)
  }

  entries.push(data)
  ext.runtime.sendMessage({
    type: 'UPDATE_ENTRY',
    entries,
  })

  ext.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case 'PULL_ENTRIES':
        ext.runtime.sendMessage({
          type: 'UPDATE_ENTRY',
          entries,
        })
        break;

      case 'CLEAR_ENTRIES':
        entries = entries.filter(e => e.tabId !== message.tabId)
        break;
    }
  })
}


ext.webRequest.onHeadersReceived.addListener(
  (req) => processURL(req, true),
  {
    urls: [
      "*://*.google-analytics.com/collect?*",
      "*://*.google-analytics.com/r/collect?*",
      "*://*.google-analytics.com/__utm.gif?*",
    ],
  },
);


ext.webRequest.onErrorOccurred.addListener(
  (req) => processURL(req, false),
  {
    urls: [
      "*://*.google-analytics.com/collect?*",
      "*://*.google-analytics.com/r/collect?*",
      "*://*.google-analytics.com/__utm.gif?*",
    ],
  },
);