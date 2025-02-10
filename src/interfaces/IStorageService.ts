export interface IStorageService {
    uploadFile(file: Express.Multer.File): Promise<any>;
  }