import { Router , Request , Response } from "express";
import multer from "multer";
import { analysisQueue } from "../queues/analysisQueue";
import { Job } from "bullmq";

const router = Router();

const MAX_FILE_SIZE = 10*1024*1024;

/**
 * Configure multer for file uploads.
 * We use memoryStorage to keep the file as a Buffer in memory, which is more
 * efficient for our use case as we don't need to write it to disk on the API server.
 * The file buffer will be passed directly to the job queue.
 */
const upload = multer({
    storage: multer.memoryStorage(),
    limits : {
        fileSize : MAX_FILE_SIZE,
    },
   fileFilter: (req, file, cb) => {
    // We use a file filter to validate that only.xlsx files are uploaded.
    if (
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' &&
      file.originalname.endsWith('.xlsx')
    ) {
      // Accept the file
      cb(null, true);
    } else {
      // Reject the file
      cb(new Error('Invalid file type. Only.xlsx files are allowed.'));
    }
  },
})


/**
 * POST /api/upload
 * This endpoint handles the file upload.
 * 1. It uses the multer middleware to process a single file named 'spreadsheet'.
 * 2. It validates that a file was actually uploaded.
 * 3. It adds a job to the 'analysis-queue' with the file buffer and original name.
 * 4. It immediately responds to the client with the ID of the created job.
 */
router.post(
    '/upload',
    upload.single('spreadsheet'),
    async(req : Request , res:Response) =>{
        if(!req.file) {
            return res.status(400).json({error : "bro no file uplaoded"});
        }
        try{
            //the job payload contains the raw file data (as a buffer) and its original name.
            //this is all the worker needs to process the file
            const jobPayload = {
                fileBuffer : req.file.buffer,
                originalName : req.file.originalname
            };

            //add the job to our analysis queue
            //we give the job a desc for easier indentification 
            const job: Job = await analysisQueue.add("analayze spreadsheet " ,jobPayload);

            console.log(`job with job id : ${job.id} added to the queue`)

            //now we respond to the client asap
            //the client can use this job id to make sure of its unique identity and use it later 
            // A 202 Accepted status code is appropriate here, indicating the request
            // has been accepted for processing, but is not yet complete.
            return res.status(202).json({ jobId: job.id });


        }
        catch(e){
            console.error('Failed to add job to queue:', e);
            return res.status(500).json({ error: 'Internal server error.' });
        }
    }
)

router.use((err : any , req : Request , res : Response , next : Function) =>{
    if(err instanceof multer.MulterError){
        return res.status(400).json({error : `there has been an issue in uploading the file : ${err.message}`});
    }
    else if (err){
        return res.status(400).json({error : err.message})
    }
})

export default router;