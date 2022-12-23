import { BigNumber } from 'ethers';
import { CommercialTypes, Methods } from '../enumeration/comercialType';
import { RentStatus, SellStatus } from '../enumeration/commercialStatus';
import { ExchangeType } from '../enumeration/exchangeType';
import { IDurationRisk } from './listingType.model';
import { IOption } from './options.model';
import { IDistrictsAddress, IProvincesAddress } from './provinces.model';

interface IListingType {
  name: string;
  id: string;
}

export interface IAsset {
  id: string;
  createdDate: Date;
  address: string;
  images: string;
  tHash: string;
  value: BigNumber | undefined;
  dailyPayment: BigNumber | undefined;
  ownership: BigNumber | undefined;
  owner: string | undefined;
  validator: string | undefined;
  totalStake: BigNumber | undefined;
  // options: IOption[];
  listingPotentials: IOption[];
  fee: number | null;
  price: number | null;
  typeId: string;
  rentCost?: number;
  goodPrice: number;
  durationRisk: IDurationRisk;
  name: string;
  period: number;
  licenseDate: string | undefined;
  licensePeriod: number | undefined;
  commercialTypes: CommercialTypes[];
  option: Methods;
  goodRentCost?: number;
  location: string;
  areaLand: number;
  type: IListingType;
  quality: string;
  numberOfStorey: number;
  level: ExchangeType;
  province: IProvincesAddress;
  district: IDistrictsAddress;
  sellStatus: SellStatus;
  rentStatus: RentStatus;
  minPrice: number;
  maxPrice: number;
  minRentCost: number;
  maxRentCost: number;
  ownersCount?: number;
  publicShow: boolean;
}
