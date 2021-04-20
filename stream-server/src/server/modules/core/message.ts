export interface Message {
    channel: number;
    command: string;
    payload: { [key: string]: any };
}
