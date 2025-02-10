import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import { IDatabaseService } from '../../interfaces/IDatabaseService';

dotenv.config();

export class SQSListener {
  private sqs: AWS.SQS;
  private queueUrl: string;
  private databaseService: IDatabaseService;
  private isRunning: boolean;

  constructor(databaseService: IDatabaseService) {
    this.sqs = new AWS.SQS({ region: process.env.AWS_REGION });
    this.queueUrl = process.env.SQS_VIDEO_UPDATE_URL || '';
    this.databaseService = databaseService;
    this.isRunning = true; // 🔹 Variável para manter o loop rodando
  }

  public async listenQueue(): Promise<void> {
    console.log('📡 Iniciando monitoramento da fila SQS...');

    while (this.isRunning) {
      try {
        const messages = await this.receiveMessages();
        if (messages.length > 0) {
          for (const message of messages) {
            if (message.Body) {
              try {
                const payload = JSON.parse(message.Body);
                await this.processMessage(payload);
                await this.deleteMessage(message.ReceiptHandle!);
              } catch (error) {
                console.error('❌ Erro ao processar mensagem:', error);
              }
            }
          }
        } else {
          // Nenhuma mensagem encontrada, aguardar antes de tentar novamente
          console.log('📭 Nenhuma mensagem na fila. Aguardando...');
          await this.sleep(5000);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar mensagens da fila SQS:', error);
        await this.sleep(5000); // 🔹 Espera antes de tentar novamente
      }
    }
  }

  private async receiveMessages(): Promise<AWS.SQS.Message[]> {
    try {
      const params: AWS.SQS.ReceiveMessageRequest = {
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 10, // 🔹 Buscar até 10 mensagens por vez
        WaitTimeSeconds: 10, // 🔹 Long polling para reduzir chamadas desnecessárias
        VisibilityTimeout: 20, // 🔹 Tempo antes que a mensagem reapareça na fila se não for deletada
      };

      const data = await this.sqs.receiveMessage(params).promise();
      return data.Messages || [];
    } catch (error) {
      console.error('❌ Erro ao receber mensagens da SQS:', error);
      return [];
    }
  }

  private async processMessage(payload: any): Promise<void> {
    try {
      const { userId, fileId, status } = payload;
      if (!userId || !fileId || !status) {
        console.warn('⚠️ Mensagem SQS inválida, ignorando:', payload);
        return;
      }

      console.log(`🔄 Atualizando status do vídeo (${fileId}) para "${status}"...`);
      await this.databaseService.updateVideoStatus(userId, fileId, status);
      console.log('✅ Status atualizado com sucesso.');
    } catch (error) {
      console.error('❌ Erro ao processar mensagem da fila:', error);
    }
  }

  private async deleteMessage(receiptHandle: string): Promise<void> {
    try {
      const params: AWS.SQS.DeleteMessageRequest = {
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      };
      await this.sqs.deleteMessage(params).promise();
      console.log('🗑️ Mensagem removida da fila.');
    } catch (error) {
      console.error('❌ Erro ao deletar mensagem da fila:', error);
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public stopListener(): void {
    this.isRunning = false;
    console.log('🛑 O listener da fila SQS foi interrompido.');
  }
}
