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

const inputSelector = tool({
    name : 'input_selector',
    description : 'gives the input selector for the send keys', 
    parameters : z.object({
        query : z.string().describe('The query for which you have to find selector')
    }),
    async execute(input){
        const query = input.query;
        console.log(query);
        
 
         const date = new Date().toISOString().replace(/[:.]/g, "-");
        await page.screenshot({ fullPage: true , path : `screenshot-${date}.png`});
        console.log('took ss');
        
        const fileId = await createFile(`screenshot-${date}.png`)
        console.log('uploaded_filess');
        fs.unlinkSync(`screenshot-${date}.png`);
        console.log('reached here')
       const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
            {
            role: "user",
            content: [
                { type: "input_text", text: `Find the input selector for send keys for "${query}" in the screenshot(priority use placeholder or input type (conditionally ) selector for playwright strictly analyze given image for this ,   )` },
                {
                type: "input_image",
                file_id: fileId,
                },
            ],
            },
        ],
        });
         const output = response.output_text || response?.output?.[0]?.content?.[0]?.text;
        console.log("Coordinates Response:", output);

        return output || "Could not determine coordinates";
    }

})

const findXandYCoordinates = tool({
    name:'find_x_and_y_coordinates',
    description: 'Gives x and y cordinates of the element according to the query for clicking',
    parameters: z.object({
       
        query : z.string().describe('The query for which you have to find x and y cordinates')
    }), 
    async execute(input){
        const query = input.query;
        console.log(query);
        
 
         const date = new Date().toISOString().replace(/[:.]/g, "-");
        await page.screenshot({ fullPage: true , path : `screenshot-${date}.png`});
        console.log('took ss');
        
        const fileId = await createFile(`screenshot-${date}.png`)
        console.log('uploaded_filess');
        fs.unlinkSync(`screenshot-${date}.png`);
        console.log('reached here')
       const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
            {
            role: "user",
            content: [
                { type: "input_text", text: `Find the x and y(increase y by 20) coordinates of the "${query}" in the screenshot accurately recheck is the cordinate really correct ` },
                {
                type: "input_image",
                file_id: fileId,
                },
            ],
            },
        ],
        });
         const output = response.output_text || response?.output?.[0]?.content?.[0]?.text;
        console.log("Coordinates Response:", output);

        return output || "Could not determine coordinates";
    }
})


const visualAnalysis = tool({
  name: 'visual_analysis',
  description : 'Takes a screenshot of the current page and give its analysis , that whether the desired task is complete or not , and what to do to correct , or achieve what is needed',
  parameters : z.object({
    query: z.string().describe('Last step performed')
  }),
  async execute(){
    console.log(lastToolUsed);
    
    if (lastToolUsed === 'take_screenshot') {
        console.log('skipping ss');
        
      return { status: 'Screenshot skipped to avoid consecutive calls' };
    }
    const date = new Date().toISOString().replace(/[:.]/g, "-");
    await page.screenshot({ fullPage: true , path : `screenshot-${date}.png`});
    console.log('took ss');
    
    const fileId = await createFile(`screenshot-${date}.png`)
    console.log('uploaded_filess');
    fs.unlinkSync(`screenshot-${date}.png`);
    
    lastToolUsed = 'take_screenshot'

    
   const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: [
        {
        role: "user",
        content: [
            { type: "input_text", text:  `What is in the picture give description of the picture in detail so that it can be used to imagine the whole page via words and also 
                most importantly examine last step performed was succesfull or you have to correct it , and what should be the next step
                 `  },
            {
            type: "input_image",
            file_id: fileId,
            },
        ],
        },
    ],
    });

   
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
    await page.mouse.click(input.x, input.y);
    lastToolUsed = 'click_screen'
    console.log( `Clicked on x:${input.x} , y: ${input.y}`);
    
    return {status : `Clicked on x:${input.x} , y: ${input.y}`}
  },
});

const sendKeys = tool({
  name: 'send_keys',
  description: 'Types text into an input field',
  parameters: z.object({
    selector: z.string().describe('CSS selector of the input field'),
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
        await page.evaluate((pixels) => window.scrollBy(0, pixels), input.pixels);
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

  rules :- 
  - Use 'visual_analysis' to check what is happening and everything went well or not . 
  - to nagivate and to find where to click use 'find_x_and_y_cordinates'
  - but to put values in a form always use 'send_keys' 
  - for send keys to find selector use 'input_selector' if failed use 'visual_analysis'

  examples of toolcalls :-
  - user query :- 'open ui.chaicod.com' and automatically find sign up form and fill the following details ' 
  - open_url ('ui.chaicode.com)
  - visual_analysis()
  - find_x_and_y_cordinates('query according to user query and visual analysis to find signup button')
  - click({x:acc to the find x and y cordinates ,y:acc to the find x and y cordinates})
  - visual_analysis() - to check whether the click was correct 
  - input_selector('query according to visual analysis ')(input selector as in visual analysis we got to know it has forms)
  - send_keys('input selector according to the last tool', 'information by user')
  - visual_analyisi() - check whether all input fields are filled or not (and is correctly filled according to the user's query, for example:- user wants yash@gmail.com and in screenshot it is johndoe@gmail.com repeat last few steps till it is correct)
  - find_x_and_y_cordinates('query according to user query and visual analysis to find submit button')
  - click(x , y ) - to submit the form(scroll few pixels if not visible)
  -visual_analysis() - to check successfully completed or not(action/submit button clicked or not)
  use your basic logic to orchestrate in between 
  repeat the step if a step in between fails .


  `,
  tools : [ visualAnalysis ,openBrowser , openURL , clickOnScreen , sendKeys ,doublClick  ,scroll , findXandYCoordinates , inputSelector]
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










