import express from 'express';
import getRoot from '../controllers/root/getRoot';
import postRoot from '../controllers/root/postRoot';
import { printPdfKit } from '../controllers/root/pdfKit';


const root = express.Router()

root.get('/', getRoot)
root.post('/', postRoot)

root.post('/print-pdfkit', printPdfKit)


export default root