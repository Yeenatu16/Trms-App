/**  import { Injectable, Logger } from '@nestjs/common';
 import twilio from 'twilio';

 @Injectable()
 export class NotificationsService {
   private readonly logger = new Logger(NotificationsService.name);
   private twilioClient: twilio.Twilio | null = null;

   constructor() {
     const accountSid = process.env.TWILIO_ACCOUNT_SID;
     const authToken = process.env.TWILIO_AUTH_TOKEN;
     if (accountSid && authToken) {
  this.twilioClient = new twilio.Twilio(accountSid, authToken);
       this.logger.log('Twilio client initialized for Live SMS');
     }
   }
    Sends SMS notifications to patients when referrals are accepted.
   async sendReferralAcceptedSMS(
     phone: string,
     token: string,
     facilityName: string,
   ) {
     if (!phone) {
       this.logger.warn(
         `Missing phone number, skipping SMS notification for Token [${token}]`,
       );
       return { success: false, message: 'No phone number provided' };
     }

     const message = `TRMS: Your referral to ${facilityName} has been ACCEPTED. Your tracker token is: ${token}. Please present this upon arrival.`;

     if (this.twilioClient) {
       try {
         const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
         if (!twilioPhone) {
           throw new Error(
             'TWILIO_PHONE_NUMBER is required but not set in .env',
           );
         }

         const response = await this.twilioClient.messages.create({
           body: message,
           from: twilioPhone,
           to: phone,
         });

         this.logger.log(
           `Live Twilio SMS dispatched to ${phone}. SID: ${response.sid}`,
         );
         return { success: true, token, provider: 'TWILIO', sid: response.sid };
       } catch (error: any) {
          eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
         this.logger.error(`Failed to send Live Twilio SMS: ${error.message}`);
       }
     }
      MOCK SMS OUTPUT (Fallback / Dev mode)
     this.logger.log(`\n================= MOCK SMS DISPATCH =================`);
     this.logger.log(`To: ${phone}`);
     this.logger.log(`Message: ${message}`);
     this.logger.log(`=====================================================\n`);

      Simulating network delay
     await new Promise((resolve) => setTimeout(resolve, 500));
     return { success: true, token, provider: 'MOCK' };
   }
 }
**/