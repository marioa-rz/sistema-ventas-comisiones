import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';

export interface PaymentProofFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export interface StoredPaymentProof {
  path: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

@Injectable()
export class PaymentProofStorage {
  async upload(file: PaymentProofFile): Promise<StoredPaymentProof> {
    const extension = this.validate(file);
    const configuration = this.configuration();
    const path = `orders/pending/${randomUUID()}.${extension}`;
    const response = await fetch(this.objectUrl(configuration, path), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${configuration.serviceRoleKey}`,
        apikey: configuration.serviceRoleKey,
        'Content-Type': file.mimetype,
        'x-upsert': 'false',
      },
      body: file.buffer,
    });
    if (!response.ok) {
      throw new ServiceUnavailableException('Payment proof could not be stored');
    }

    return {
      path,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }

  async remove(path: string): Promise<void> {
    const configuration = this.configuration();
    const response = await fetch(this.objectUrl(configuration, path), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${configuration.serviceRoleKey}`,
        apikey: configuration.serviceRoleKey,
      },
    });
    if (!response.ok && response.status !== 404) {
      throw new ServiceUnavailableException('Payment proof cleanup failed');
    }
  }

  private validate(file: PaymentProofFile): string {
    if (!file.originalname.trim() || file.originalname.length > 255) {
      throw new BadRequestException('Payment proof filename is too long');
    }
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'application/pdf': 'pdf',
    };
    const extension = extensions[file.mimetype];
    if (!extension) throw new BadRequestException('Only JPEG, PNG, or PDF payment proofs are allowed');
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Payment proof exceeds the 5 MiB limit');
    }
    if (!file.size || file.buffer.length !== file.size) {
      throw new BadRequestException('Payment proof is empty or incomplete');
    }
    const signatures: Record<string, Buffer> = {
      'image/jpeg': Buffer.from([0xff, 0xd8, 0xff]),
      'image/png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      'application/pdf': Buffer.from('%PDF-'),
    };
    const signature = signatures[file.mimetype];
    if (!signature || !file.buffer.subarray(0, signature.length).equals(signature)) {
      throw new BadRequestException('Payment proof content does not match its declared MIME type');
    }
    return extension;
  }

  private configuration() {
    const supabaseUrl = process.env.SUPABASE_URL?.trim().replace(/\/$/, '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const bucket = process.env.SUPABASE_STORAGE_PAYMENT_PROOF_BUCKET?.trim();
    if (!supabaseUrl || !serviceRoleKey || !bucket) {
      throw new ServiceUnavailableException('Payment proof storage is not configured');
    }
    return { supabaseUrl, serviceRoleKey, bucket };
  }

  private objectUrl(configuration: ReturnType<PaymentProofStorage['configuration']>, path: string): string {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    return `${configuration.supabaseUrl}/storage/v1/object/${encodeURIComponent(configuration.bucket)}/${encodedPath}`;
  }
}
