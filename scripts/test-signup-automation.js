const browserPort = 57475;

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.callbacks = new Map();
    this.eventListeners = [];
    this.ready = new Promise((resolve) => {
      this.ws.onopen = resolve;
    });
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const cb = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) {
          cb.reject(msg.error);
        } else {
          cb.resolve(msg.result);
        }
      } else {
        for (const listener of this.eventListeners) {
          listener(msg);
        }
      }
    };
  }

  async send(method, params = {}, sessionId = undefined) {
    await this.ready;
    const msgId = ++this.id;
    const payload = { id: msgId, method, params };
    if (sessionId) {
      payload.sessionId = sessionId;
    }
    return new Promise((resolve, reject) => {
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  addEventListener(listener) {
    this.eventListeners.push(listener);
  }

  close() {
    this.ws.close();
  }
}

async function runTest() {
  let client;
  let targetId;
  try {
    const res = await fetch(`http://127.0.0.1:${browserPort}/json/version`);
    const versionInfo = await res.json();
    const browserWsUrl = versionInfo.webSocketDebuggerUrl;
    console.log('Connecting to browser WebSocket:', browserWsUrl);
    client = new CDPClient(browserWsUrl);

    const { targetId: createdTargetId } = await client.send('Target.createTarget', {
      url: 'http://localhost:8080/signup/institution'
    });
    targetId = createdTargetId;
    console.log('Created target tab:', targetId);

    const { sessionId } = await client.send('Target.attachToTarget', {
      targetId,
      flatten: true
    });
    console.log('Attached to target with session ID:', sessionId);

    await client.send('Runtime.enable', {}, sessionId);
    await client.send('Page.enable', {}, sessionId);

    client.addEventListener((msg) => {
      if (msg.method === 'Runtime.consoleAPICalled') {
        const args = msg.params.args.map(a => a.value || JSON.stringify(a)).join(' ');
        console.log('[BROWSER CONSOLE]', args);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails);
      }
    });

    async function evalJS(expression) {
      const result = await client.send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      }, sessionId);
      if (result.exceptionDetails) {
        throw new Error('JS Evaluation failed: ' + JSON.stringify(result.exceptionDetails));
      }
      return result.result.value;
    }

    async function waitForSelector(selector, timeoutMs = 15000) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const exists = await evalJS(`!!document.querySelector('${selector}')`);
        if (exists) return true;
        await new Promise(r => setTimeout(r, 200));
      }
      throw new Error(`Timeout waiting for selector: ${selector}`);
    }

    async function typeText(selector, text) {
      await evalJS(`
        (function() {
          const el = document.querySelector('${selector}');
          if (!el) throw new Error('Element not found: ${selector}');
          el.value = ${JSON.stringify(text)};
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        })()
      `);
    }

    async function clickButtonWithText(text) {
      await evalJS(`
        (function() {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('${text}'));
          if (!btn) throw new Error('Button with text not found: ${text}');
          btn.click();
        })()
      `);
    }

    console.log('Waiting for Step 1 input fields...');
    await waitForSelector('#inst-name');

    const email = `test-univ-auto-${Math.floor(Math.random() * 1000000)}@example.com`;
    console.log('Filling out Step 1 with email:', email);
    await typeText('#inst-name', 'Auto Test University');
    await typeText('#inst-email', email);
    await typeText('#inst-pass', 'Password123!');
    await typeText('#inst-pass2', 'Password123!');

    console.log('Clicking Continue to Step 2...');
    await clickButtonWithText('Continue');

    console.log('Waiting for Step 2 input fields...');
    await waitForSelector('#inst-web');

    console.log('Filling out Step 2...');
    await typeText('#inst-web', 'https://auto-univ.edu');
    await typeText('#inst-phone', '1234567890');
    await typeText('#inst-country', 'US');

    console.log('Clicking Continue to Step 3...');
    await clickButtonWithText('Continue');

    console.log('Waiting for Step 3 input fields...');
    await waitForSelector('#inst-address');

    console.log('Filling out Step 3...');
    await typeText('#inst-address', '456 Automation Way');
    await typeText('#inst-state', 'CA');
    await typeText('#inst-city', 'Los Angeles');

    console.log('Clicking Continue to Step 4 (Review)...');
    await clickButtonWithText('Continue');

    console.log('Waiting for Step 4 terms checkbox...');
    await waitForSelector('#inst-terms');

    console.log('Agreeing to terms...');
    await evalJS(`document.getElementById('inst-terms').click()`);

    console.log('Submitting application...');
    await clickButtonWithText('Submit application');

    console.log('Waiting for result...');
    // Let's wait 10 seconds for results
    await new Promise(r => setTimeout(r, 10000));

    // Check if error message is displayed
    const errorMessage = await evalJS(`
      (function() {
        const el = document.querySelector('[role="alert"]');
        return el ? el.textContent : null;
      })()
    `);

    if (errorMessage) {
      console.log('Submission failed with visible error on page:', errorMessage);
    } else {
      console.log('No visible error found. Checking page URL...');
      const url = await evalJS('window.location.href');
      console.log('Current page URL:', url);
    }

  } catch (err) {
    console.error('Test run failed with error:', err);
  } finally {
    if (client && targetId) {
      console.log('Closing target tab...');
      try {
        await client.send('Target.closeTarget', { targetId });
      } catch (e) {
        console.error('Failed to close target:', e);
      }
      client.close();
    }
  }
}

runTest();
