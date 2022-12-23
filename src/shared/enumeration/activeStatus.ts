export enum ActiveStatus {
  ENABLE = 'ENABLE',
  DISABLE = 'DISABLE',
}

export const activeStatusArray: ActiveStatus[] = [ActiveStatus.ENABLE, ActiveStatus.DISABLE];

export const mapActiveStatus: { [key in ActiveStatus]: string } = {
  [ActiveStatus.ENABLE]: 'ĐANG HOẠT ĐỘNG',
  [ActiveStatus.DISABLE]: 'KHÔNG HOẠT ĐỘNG',
};

export const mapActiveStatusBadge: { [key in ActiveStatus]: string } = {
  [ActiveStatus.ENABLE]: 'success',
  [ActiveStatus.DISABLE]: 'secondary',
};
