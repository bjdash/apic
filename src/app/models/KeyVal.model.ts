export interface KeyVal {
  key: string,
  val: string,
  readOnly?: boolean,
  active?: boolean,
  type?: 'text' | 'file' | 'json',
  meta?: any //aditional metadata, for example when used in key val editor to store file type
};