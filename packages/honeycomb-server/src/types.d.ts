declare module "swagger-jsdoc" {
  export interface Options {
    definition: any;
    apis: string[];
  }

  export default function swaggerJsdoc(options: Options): any;
}

declare module "swagger-ui-express" {
  import { RequestHandler } from "express";

  export function serve(handlers: any[]): RequestHandler[];
  export function setup(swaggerDoc: any, options?: any): RequestHandler;
}
