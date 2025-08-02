import {Job , Worker} from 'bullmq';
import { config } from './config';
import ExcelJS from 'exceljs';

interface AnalysisJobdata{
    fileBuffer : Buffer , 
    originalName : string;

}

/**
 * this is where all the heavy lifting will take place and all the data will be parse in ways we want it to 
 * @param job is the job we will recieve from BullMQ
 */

const analysisProcessor = async(job : Job<AnalysisJobdata>) => {
    console.log(`starting with the processing of ${job.id} for file ${job.data.originalName}`)

    try{

        const {fileBuffer} = job.data;
        //to extract the data from job.data by deconstructing it 

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(fileBuffer);

        const resultBySheet: {sheetName : string , data : any[]} [] = []; 
        //we declare that we will get data for each sheet in the form of an array which will have at first the sheetname and then the data in the from we have extracted below

        workbook.eachSheet((worksheet , sheetId) =>{
            console.log(`parsing sheet: ${worksheet.name}`);

            const sheetData  : any[] = [];
            const headerRow = worksheet.getRow(1);
            //to get the headers of the sheet data we are using here

            if (!headerRow.values || !Array.isArray(headerRow.values) || headerRow.values.length <= 1) {
                console.warn(`Sheet '${worksheet.name}' is empty or has no header row. Skipping.`);
                return; // 'return' here exits the callback for the current sheet and moves to the next.
            }

            const headers = (headerRow.values as string[]).slice(1);

            //the below function is where our magic of converting the data into json happens and we get the WHOLE EXCEL FILE as an array of objects which we will later use 
            worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber > 1) {
                const rowObject: { [key: string]: any } = {};
                // .values is also a sparse array-like object, slice(1) aligns with headers.
                const rowValues = (row.values as any[]).slice(1);

                headers.forEach((header, index) => {
                // we map each header to its corresponding cell value for the current row.
                rowObject[header] = rowValues[index];
            });
            sheetData.push(rowObject);
        }
        });
        resultBySheet.push({
            sheetName : worksheet.name,
            data: sheetData
        });
        });
        console.log(`Successfully parse ${resultBySheet.length} sheets for job ${job.id}.`);

        return resultBySheet;
    }
    catch(error){
        console.error(`job ${job.id} failed for file ${job.data.originalName}. Error : ${error}`)
        throw error;
    }
};

/**
 * Instanstiat the worker we have made above
 * now if you are reading this code and you have never really worked with jobs and queus and workers before , the below code is NOTHING at all , we are basically spawning our workers here and we give them the above function as the brain
 */
const analysisWorker = new Worker<AnalysisJobdata>(config.queueName , analysisProcessor , {
    connection : {
        host : config.redis.host, 
        port : config.redis.port,
    },
    concurrency : 5
});

// worker event listeners

analysisWorker.on('completed' , (job : Job , resutl : any)=>{
    console.log(`job ${job.id} has been completed successfully. Result has ${resutl.length} sheets.`);
});

analysisWorker.on('failed', (job: Job | undefined, err: Error) => {
  if (job) {
    console.error(`Job ${job.id} has failed with error: ${err.message}`);
  } else {
    console.error(`An unknown job has failed with error: ${err.message}`);
  }
});

console.log('Analysis worker started. Waiting for jobs...');