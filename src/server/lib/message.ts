export interface Message {
  method: string;
  data: {
    // eslint-disable-next-line
    [key: string]: any;
  };
}
