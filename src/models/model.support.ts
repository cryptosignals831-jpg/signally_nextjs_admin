import { Expose, instanceToPlain, plainToInstance, Type } from 'class-transformer';
import 'reflect-metadata';
import { convertToDate } from '../utils/convert_to_date';

export type SupportStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export class SupportModel {
  @Expose({ name: 'id' }) id: string = '';
  @Expose() userId: string = '';
  @Expose() name: string = '';
  @Expose() email: string = '';
  @Expose() category: string = '';
  @Expose() subject: string = '';
  @Expose() message: string = '';
  @Expose() status: SupportStatus = 'open';
  @Expose() adminUnread: boolean = false;
  @Expose() userUnread: boolean = false;
  @Expose() lastMessage: string = '';
  @Expose() lastSender: string = 'user';
  @Expose() @Type(() => Date) timestampCreated?: Date | null = null;
  @Expose() @Type(() => Date) timestampUpdated?: Date | null = null;

  static fromJson(json: any): SupportModel {
    json = convertObjectDate(json);
    return plainToInstance(SupportModel, json, { exposeDefaultValues: true, excludeExtraneousValues: true });
  }

  static toJson(support: SupportModel): any {
    return instanceToPlain(support);
  }
}

export class SupportMessageModel {
  @Expose({ name: 'id' }) id: string = '';
  @Expose() ticketId: string = '';
  @Expose() senderId: string = '';
  @Expose() senderName: string = '';
  @Expose() senderRole: 'user' | 'admin' = 'user';
  @Expose() text: string = '';
  @Expose() isRead: boolean = false;
  @Expose() @Type(() => Date) timestamp?: Date | null = null;

  static fromJson(json: any): SupportMessageModel {
    if (json) {
      json.timestamp = convertToDate(json.timestamp) || new Date();
    }
    return plainToInstance(SupportMessageModel, json, { exposeDefaultValues: true, excludeExtraneousValues: true });
  }

  static toJson(msg: SupportMessageModel): any {
    return instanceToPlain(msg);
  }
}

function convertObjectDate(json: any) {
  if (!json) return json;
  json.timestampCreated = convertToDate(json.timestampCreated) || new Date();
  json.timestampUpdated = convertToDate(json.timestampUpdated) || new Date();
  return json;
}
