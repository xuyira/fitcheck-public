declare module "ali-oss" {
  interface Options {
    region: string;
    endpoint?: string;
    accessKeyId: string;
    accessKeySecret: string;
    bucket: string;
    secure?: boolean;
  }

  interface PutResult { name: string; url: string }

  export default class OSS {
    constructor(options: Options);
    put(name: string, data: Buffer, options?: { headers?: Record<string, string> }): Promise<PutResult>;
    signatureUrl(name: string, options?: { expires?: number; method?: string }): string;
  }
}
