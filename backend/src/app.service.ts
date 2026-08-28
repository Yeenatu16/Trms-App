import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'HELLO OUR TEAM MEMBERS AT VITE TECHNOLOGY P.L.C!';
  }
}
