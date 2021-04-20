import { GuiChannel } from './gui-channel';
export interface GuiMessage {
    channel: GuiChannel;
    data: any;
}
