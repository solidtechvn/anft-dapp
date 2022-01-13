import dayjs from 'dayjs';
import { BigNumber, ethers } from 'ethers';
import { APP_DATE_FORMAT, TOKEN_SYMBOL } from '../config/constants';
import { IAsset } from './models/assets.model';
import { baseOptions } from './models/options.model';

export const estimateOwnership = (amount: BigNumber, dailyPayment: BigNumber, currentOwnership: BigNumber) => {
  const initialOwnership = checkOwnershipExpired(currentOwnership.toNumber())
    ? BigNumber.from(dayjs().unix())
    : currentOwnership;

  const additionalCredit = amount.mul(86400).div(dailyPayment).toNumber();

  const newOwnership = initialOwnership.toNumber() + additionalCredit;
  return convertUnixToDate(newOwnership);
};

export const noMoreThanOneCommas = (input: number | string) => {
  const str = input.toString();
  let commasCount = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '.') commasCount++;
    if (commasCount > 1) break;
  }
  return commasCount <= 1;
};

export const insertCommas = (input: number | undefined | string) => {
  if (typeof input !== 'undefined') {
    if (!noMoreThanOneCommas(input)) return '';
    const parts = input.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (parts[1]) parts[1] = parts[1].substring(0, 4); // Only take the first 4 decimals
    return parts.join('.');
  } else {
    return '';
  }
};

export const unInsertCommas = (input: string) => {
  const parts = input.split('.');
  parts[0] = parts[0].replaceAll(',', '');
  if (parts[1]) parts[1] = parts[1].substring(0, 4); // Only take the first 4 decimals
  return parts.join('.');
};

export const convertBnToDecimal = (input: BigNumber) => {
  return ethers.utils.formatEther(input.toString());
};
export const convertDecimalToBn = (input: string) => {
  const sanitizedInput = input.replace(/[^\d.-]/g, ''); //https://stackoverflow.com/questions/1862130/strip-all-non-numeric-characters-from-string-in-javascript
  if (!sanitizedInput) return BigNumber.from(0);
  return ethers.utils.parseUnits(sanitizedInput);
};

export const formatBNToken = (input: BigNumber | undefined, displaySymbol: boolean) => {
  if (!input) return '_';
  const formatedAmount = insertCommas(convertBnToDecimal(input));
  return `${formatedAmount} ${displaySymbol ? TOKEN_SYMBOL : ''}`;
};

export const checkOwnershipExpired = (timestamp: number): boolean => {
  const currTimstamp = dayjs().unix();
  return currTimstamp >= timestamp;
};

export const convertUnixToDate = (timestamp: number): string => {
  return dayjs.unix(timestamp).format(APP_DATE_FORMAT);
};
export const getEllipsisTxt = (str: string, n = 5) => {
  if (str) {
    return `${str.slice(0, n)}...${str.slice(str.length - n)}`;
  }
  return '';
};

export const estimateWithdrawAmount = (dailyPayment: BigNumber, currentOwnership: BigNumber, currentUnix: number) => {
  if (currentOwnership.toNumber() > currentUnix) {
    const amount = ((currentOwnership.toNumber() - currentUnix) * Number(convertBnToDecimal(dailyPayment))) / 86400;
    return amount;
  }
  return 0;
};

// Returns true if viewer is the listing owner AND ownership is not expired
export const validateOwnership = (viewerAddr: string | undefined, listingInfo: IAsset) => {
  const { ownership, owner } = listingInfo;
  if (!ownership || !owner) {
    return false;
  }
  const viewerIsOwner = viewerAddr === owner;
  const ownershipExpired = checkOwnershipExpired(ownership.toNumber());

  if (!viewerIsOwner) return false;

  return !ownershipExpired;
};

export const formatLocalDatetime = (input: string | Date | undefined): string => {
  return dayjs(input).format(APP_DATE_FORMAT);
};

export const returnOptionNameById = (optionId: number): string => {
  const optionsPromises = baseOptions.find((item) => item.id === optionId);
  if (optionsPromises) {
    return optionsPromises.name;
  } else {
    return '_';
  }
};

// 2 Inputs here is always defined, no need for ? checking
// Use moment.Momment.diff to calculate the difference instead of manual math
// https://stackoverflow.com/questions/25150570/get-hours-difference-between-two-dates-in-moment-js
// countDateDiffrence => Grammar. change to calculateDateDifference since you've always used "caculate" instead of "count"
// dueDate / toDate has the same meaning, change to fromDate/toDate for startDate/endDate
export const countDateDiffrence = (dueDate?: string, toDate?: string): number => {
  if (!dueDate || !toDate) return 0;
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const dueDateObj = new Date(dueDate);
  const toDateObj = new Date(toDate);
  const diffDays = Math.floor(Math.abs((Number(dueDateObj) - Number(toDateObj)) / oneDay));
  return diffDays;
};
