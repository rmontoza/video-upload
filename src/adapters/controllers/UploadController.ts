import { Request, Response } from 'express';
import jwt from 'jsonwebtoken'; // 🔹 Biblioteca para decodificar JWT
import { IStorageService } from '../../interfaces/IStorageService';
import { IDatabaseService } from '../../interfaces/IDatabaseService';
import { CacheService } from '../../core/services/CacheService';

export class UploadController {
  private storageService: IStorageService;
  private databaseService: IDatabaseService;
  private cacheService: CacheService;

  constructor(storageService: IStorageService, databaseService: IDatabaseService, cacheService: CacheService) {
    this.storageService = storageService;
    this.databaseService = databaseService;
    this.cacheService = cacheService;
  }

  public async uploadFile(req: Request, res: Response): Promise<Response> {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).send({ message: 'Nenhum arquivo enviado.' });
      }

      // 🔹 Extrair o token do cabeçalho Authorization
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: 'Token de autenticação ausente.' });
      }

      const token = authHeader.split(' ')[1]; // Remove "Bearer "
      if (!token) {
        return res.status(401).send({ message: 'Token inválido.' });
      }

      // 🔹 Decodificar o AccessToken para obter o username
      let userId: string;
      try {
        const decodedToken = jwt.decode(token) as { [key: string]: any } | null;
        if (!decodedToken || !decodedToken.username) {
          return res.status(401).send({ message: 'Usuário não encontrado no token.' });
        }
        userId = decodedToken.username;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        return res.status(401).send({ message: 'Erro ao decodificar o token.', error: errorMessage });
      }

      // 🔹 Fazer o upload do arquivo
      const result = await this.storageService.uploadFile(file);
      const fileKey = result.Key;

      // 🔹 Armazenar userId no Redis associado ao fileKey
      await this.cacheService.setUserId(fileKey, userId);

      // 🔹 Registrar no banco de dados
      const uploadRecord = {
        fileId: fileKey,
        filePath: result.Location,
        userId: userId, // 🔹 Obtido do token JWT
        timestamp: new Date(),
        status: 'ENVIADO',
      };

      await this.databaseService.saveRecord(uploadRecord);

      return res.status(200).send({ message: 'Upload realizado com sucesso.', data: result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return res.status(500).send({ message: 'Erro ao realizar upload.', error: errorMessage });
    }
  }

  public async getVideosByUser(req: Request, res: Response): Promise<Response> {
    try {
      // 🔹 Extrair o token do cabeçalho Authorization
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: 'Token de autenticação ausente.' });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).send({ message: 'Token inválido.' });
      }

      // 🔹 Decodificar o AccessToken para obter o username
      let userId: string;
      try {
        const decodedToken = jwt.decode(token) as { [key: string]: any } | null;
        if (!decodedToken || !decodedToken.username) {
          return res.status(401).send({ message: 'Usuário não encontrado no token.' });
        }
        userId = decodedToken.username;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        return res.status(401).send({ message: 'Erro ao decodificar o token.', error: errorMessage });
      }

      // 🔹 Consultar os vídeos do usuário no banco de dados
      const userVideos = await this.databaseService.getRecordsByUser(userId);

      return res.status(200).send({ message: 'Vídeos recuperados com sucesso.', data: userVideos });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return res.status(500).send({ message: 'Erro ao recuperar vídeos.', error: errorMessage });
    }
  }
}
