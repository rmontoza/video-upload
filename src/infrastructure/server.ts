import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import { UploadController } from '../adapters/controllers/UploadController';
import { S3Service } from '../core/services/S3Service';
import { DatabaseService } from '../core/services/DatabaseService';
import { CacheService } from '../core/services/CacheService';
import { SQSListener } from '../adapters/listeners/SQSListener';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['video/mp4', 'video/mkv', 'video/avi'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de vídeo são permitidos!'));
    }
  },
});

// 🔹 Inicializando serviços
const s3Service = new S3Service();
const databaseService = new DatabaseService();
const cacheService = new CacheService();
const uploadController = new UploadController(s3Service, databaseService, cacheService);
const sqsListener = new SQSListener(databaseService);

// 🔹 Rotas
app.post('/upload', upload.single('video'), async (req, res) => {
  await uploadController.uploadFile(req, res);
});

app.get('/videos', async (req, res) => {
  await uploadController.getVideosByUser(req, res);
});

// 🔹 Iniciando o listener SQS ao subir o servidor
sqsListener.listenQueue().catch((error) => {
  console.error('❌ Erro ao iniciar o listener da fila SQS:', error);
});

app.listen(PORT, () => {
  console.log(`🚀 Serviço de Upload rodando na porta ${PORT}`);
});
