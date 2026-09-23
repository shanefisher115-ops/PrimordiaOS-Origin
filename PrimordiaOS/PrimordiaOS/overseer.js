import puppeteer from 'puppeteer';
import axios from 'axios';

// [PRIMORDIA CONFIG]
const STANLEY_URL = 'https://x.getstanley.ai/write';
const MAKE_WEBHOOK_URL = 'https://hook.us1.make.com/YOUR_WEBHOOK_ID_HERE';

async function bootStanleyOverseer() {
    console.log("[SYSTEM] Igniting PrimordiaOS Stanley Overseer...");
    
    // Blast shield removed for visual execution
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
    const page = await browser.newPage();

    console.log("[SYSTEM] Navigating to the Stanley Node...");
    await page.goto(STANLEY_URL, { waitUntil: 'networkidle2' });

    try {
        console.log("[ACTION] Scanning for new cosmic payloads...");
        console.log("[SYSTEM] WARNING: If you see a login screen, authenticate immediately. You have 60 seconds...");
        
        // 60-second tolerance for manual login override
        await page.waitForSelector('.ProseMirror', { timeout: 60000 }); 
        
        const generatedScript = await page.evaluate(() => {
            const editor = document.querySelector('.ProseMirror');
            return editor ? editor.innerText : null;
        });

        if (generatedScript) {
            console.log("[SUCCESS] Payload extracted. Routing to Plug-In OS...");
            
            // Fire the payload to your Make.com matrix
            await axios.post(MAKE_WEBHOOK_URL, {
                system: "PrimordiaOS",
                module: "StanleyOverseer",
                content: generatedScript,
                timestamp: new Date().toISOString()
            });
            console.log("[SUCCESS] Webhook fired clean.");
        } else {
            console.log("[STATUS] No new structural builds found.");
        }

    } catch (error) {
        console.error("[STRUCTURAL FAILURE] Connection to Stanley node severed: ", error.message);
    } finally {
        // Hold the browser open for 5 seconds to verify extraction
        await new Promise(resolve => setTimeout(resolve, 5000));
        await browser.close();
        console.log("[SYSTEM] Overseer cycle complete.");
    }
}

// IGNITE THE ENGINE
bootStanleyOverseer();