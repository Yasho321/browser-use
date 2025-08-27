import 'dotenv/config';
import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';
import fs from "fs";
import { chromium } from 'playwright';
import OpenAI from "openai";
import { log } from 'console';

const openai = new OpenAI();

async function createFile(filePath) {
  const fileContent = fs.createReadStream(filePath);
  const result = await openai.files.create({
    file: fileContent,
    purpose: "vision",
  });
  
  console.log("ssId",result.id)
  return result.id;
}

let browser = await chromium.launch({
  headless: false,
  chromiumSandbox: true,
  env: {},
  args: ['--disable-extensions', '--disable-file-system'],
});

let lastToolUsed = null;

const page = await browser.newPage();



const getPageInfoViaSS = tool({
  name: 'get_page_info_via_ss',
  description : 'Takes a screenshot of the current page and give its analysis , according to the query asked',
  parameters : z.object({
    query: z.string().describe('query for required info about page you need from screenshot')
  }),
  async execute(input){
    console.log(lastToolUsed);
    console.log(input.query)
    
    
    const date = new Date().toISOString().replace(/[:.]/g, "-");
    await page.screenshot({ fullPage: true , path : `screenshot-${date}.png`});
    console.log('took ss');
    
    const base64Image = fs.readFileSync(`screenshot-${date}.png`, "base64");
    console.log('uploaded_filess');
    fs.unlinkSync(`screenshot-${date}.png`);
    
    lastToolUsed = 'take_screenshot'

    console.log('here')
    
   const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: `${input.query}` },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${base64Image}`,
              detail : 'high'
            },
          ],
        },
      ],
    });

    console.log('here 2')
    console.log(response.output_text)
    return response.output_text;

    
    
   
    

  }
});

const openBrowser = tool({
  name: 'open_browser',
  description: 'Opens a Chromium browser window',
  parameters: z.object({}),
  async execute(){
    if(!browser.isConnected()){
        const newBrowser = await chromium.launch({
            headless: false,
            chromiumSandbox: true,
            env: {},
            args: ['--disable-extensions', '--disable-file-system'],
        });
        lastToolUsed = 'open_browser'
        console.log('Browser launched successfuly');
        
        return {status : 'Browser launched successfuly'}
    }
    lastToolUsed = 'open_browser'
    console.log('Browser already open');
    return { status: 'Browser already open' };
  }
});

const openURL = tool({
  name: 'open_url',
  description: 'Opens a specified URL in the browser',
  parameters: z.object({
    url: z.string().describe('The website URL to open'),
  }),
  async execute(input){
    await page.goto(input.url, { waitUntil: 'domcontentloaded' });
    lastToolUsed = 'open_url'
    console.log(`opened ${input.url}`);
    
    return {status : `opened ${input.url}`}
  }
});



const clickOnScreen = tool({
  name: 'click_screen',
  description: 'Clicks on the screen with specified co-ordinates',
  parameters: z.object({
    x: z.number().describe('x axis on the screen where we need to click'),
    y: z.number().describe('Y axis on the screen where we need to click'),
  }),
  async execute(input) {
    input.x;
    input.y;
    await page.mouse.click(input.x, input.y+10);
    lastToolUsed = 'click_screen'
    console.log( `Clicked on x:${input.x} , y: ${input.y}`);
    
    return {status : `Clicked on x:${input.x} , y: ${input.y}`}
  },
});

const clickElement = tool({
  name: 'click_element_via_css',
  description: 'Clicks on an element using a CSS selector',
  parameters: z.object({
    selector: z.string().describe('CSS selector of the element to click'),
  }),
  async execute (input) {
    try {
      const element = await page.$(input.selector); // Select element
      if (!element) {
        return  {success : false , message :`Element not found: ${selector}`};
      }

      await element.click(); // Perform click
      return { success: true, message: `Clicked on element: ${selector}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
});


const sendKeys = tool({
  name: 'send_keys',
  description: 'Types text into an input field',
  parameters: z.object({
    selector: z.string().describe('Placeholder selector or type selector or css selector of the input field'),
    text: z.string().describe('Text to type'),
  }),
  async execute(input){
    await page.fill(input.selector, input.text);
    lastToolUsed = 'send_keys'
    console.log(`Typed "${input.text}" into ${input.selector}`);
    
    return { status: `Typed "${input.text}" into ${input.selector}` };
  }
});



// Double Click, Scroll

const doublClick = tool({
    name:'double_click',
    description: 'Double clicks at specific screen coordinates',
    parameters: z.object({
        x: z.number().describe('x axis on the screen where we need to double click'),
        y: z.number().describe('y axis on the screen where we need to double click'),
    }),
    async execute(input){
        await page.mouse.dblclick(input.x, input.y);
        lastToolUsed = 'double_click'
        console.log(`Double-clicked on (${input.x}, ${input.y})`);
        
        return { status: `Double-clicked on (${input.x}, ${input.y})` };
    }
    
})


const scroll = tool({
    name:'scroll',
    description:"Scrolls the page vertically by the given number of pixels",
    parameters: z.object({
        pixels: z.number().describe('Number of pixels to scroll (positive = down, negative = up)'),
    }),
    async execute(input) {
        await page.mouse.wheel(0, input.pixels);
        lastToolUsed = 'scroll'
        console.log(`Scrolled ${input.pixels} pixels`);
        
        return { status: `Scrolled ${input.pixels} pixels` };
    },
})
const websiteAutomationAgent = new Agent({
  name: 'WebSite Automation Agent',
  model: "gpt-4o-mini",
  instructions: `
  You are an website automation agent , your work is to perform all the tasks given by the user using the tools given , 
  analyze given screenshots to determine next step to achieve users query .

  rules-
  - use 'get_page_info_via_ss' tool to get any required information about page, and for checking that it went well as planed or not , if not correct
  - use all tools required to achieve user's query (clickOnScreen , sendKeys , scroll , etc)
  - use 'get_page_info_via_ss' to know what to do where to do how to do 
  - for clicking first use click_element_via_css tool first if it returns Element not found: then fall back to click_screen
  - always use click_element_via_css first if it didnt work than move to click_screen
  - whenever giving x and y coordinates to click always keep in mind that viewport's and screenshot's width and height are (width :1280 , height : 720) increase or decrease x and y cordinates accordingly to get correct x and y
  - use css selectors like 'text=Sign Up' and 'form button[type="submit"]' as it can be deduced from image.
  example :- 
  - user query :- Open ui.chaicode.com 
    Locate the sign up section automatically via screenshot
    click on it and after locating form via screenshot
    Fill in the necessary details:-
    - first name :- Yasho
    - Last name :- Singh
    - email :- yashosingh@gmail.com 
    - password :- 123456
    Click the action/submit button
  - tool calls for this :- 
  - open_browser()
  - open_url({url : 'ui.chaicode.com'})
  - get_page_info_via_ss({query :'give page structure'})
  - get_page_infor_via_ss({query :'give simple css selector of signup button according to the image given like "text=Sign Up" '})
  - click_element_via_css({selector : 'text=Sign Up'})(important)
  - get_page_info({query :'Does the click performed right'})
  - get_page_info({query :'It looks like i clicked a bit above where it needed to be , the authentication section is closed , now I need to click on the authentication section with required adjustments give x and y cordinates'})
   - click_on_screen({x:40 , y:200})
  - get_page_info({query :'Does the click performed right'})
  - get_page_info({query :'Yes the click performed right , I can see sign up button again , give x and y cordinates with required adjustment keeping in mind errors from before'})
   - click_on_screen({x:40 , y:300})
  - get_page_infor({query :'Did the click performed right '})
  - get_page_info({query : 'yes , I can see sign up form , now give all the selectors for user's value'})
  - send_keys({selector : 'input[placeholder="John"]' , text : 'Yasho'})
  - get_page_info({query :'Did the last step went well , did the first name field filled '})
   - get_page_info({query :'Yes can move to last name now , give css selector for last name  '})
  - send_keys({selector : 'input[placeholder="Doe"]'} , text :'Singh'})
  - get_page_info({query :'Did the last step went well , did the last name field filled '})
  - get_page_info({query :'Yes can move to last name now , give css selector for email  '})
  - send_keys({selector : 'input[placeholder="john@example.com"], text: 'yashosingh@example.com'})
  - get_page_info({query :'Did the last step went well , did the image field filled '})
  - get_page_info({query :'Yes can move to password now , give css selector password  '})
  - send_keys({selector : 'input[placeholder="******"], text:"123456"})
  - get_page_info({query :'Did the last step went well , did all the fields are filled '})
  - get_page_info({query :'I can see password field is unable to fill , giving another selector to fill it ' })
  - send_keys({selector : 'input[type="password"]' , text:'123456'})
  - get_page_info({query :'Did the last step went well , did all the fields are filled '})
  - get_page_info({query :'Yes , now need to find x and y coordinates of the submit buttton '} )
  - get_page_info({query :'submit button not visible , need to scroll in the main area of the page and by how many pixels'})
  - click({x:900 , y:500})
  - scroll(300)
  - get_page_info({query :'is submit button visible now , give css selector to click on it'})
  - click_element_via_css({selector : 'form button[type="submit"]'})
  - get_page_info({quer: 'Yes , user query complete'})





  
  use your basic logic to orchestrate in between 
  repeat the step if a step in between fails .


  `,
  tools : [ getPageInfoViaSS ,openBrowser , openURL , clickOnScreen , sendKeys ,doublClick  ,scroll , clickElement]
});

async function chatWithAgent(query) {
  const result = await run(websiteAutomationAgent, query , {maxTurns : 30} );
  console.log(`History`, result.history);
  console.log(result.finalOutput);
}

chatWithAgent( `
    Open ui.chaicode.com 
    Locate the login section automatically via screenshot
    click on it and after locating form via screenshot
    Fill in the necessary details:-
    - email :- yashovardhans321@gmail.com 
    - password :- 123456
    Click the action/submit button
`)











