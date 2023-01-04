import CIcon from '@coreui/icons-react';
import {
  CButton,
  CCol,
  CForm,
  CFormGroup,
  CFormText,
  CInput,
  CInvalidFeedback,
  CLabel,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CProgress,
  CProgressBar,
  CRow,
} from '@coreui/react';
import { faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { BigNumber } from 'ethers';
import { Formik, FormikProps } from 'formik';
import moment, { Moment } from 'moment';
import React, { useEffect, useRef, useState } from 'react';
import { DateRangePicker } from 'react-dates';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';
import { APP_LOCAL_DATE_FORMAT } from '../../../config/constants';
import { LISTING_INSTANCE } from '../../../shared/blockchain-helpers';
import {
  calculateDateDifference,
  calculateRatio,
  calculateSpendingFromSecond,
  checkDateRange,
  checkOwnershipAboutToExpire,
  checkOwnershipExpired,
  convertBnToDecimal,
  convertDecimalToBn,
  convertUnixToDate,
  formatBNToken,
  getSecondDifftoEndDate,
  includeMultiple,
  insertCommas,
  manualCaretPosition,
  moneyUnitTranslate,
  returnMaxEndDate,
  unInsertCommas,
} from '../../../shared/casual-helpers';
import { ToastError, ToastSuccess } from '../../../shared/components/Toast';
import { CommercialTypes } from '../../../shared/enumeration/comercialType';
import { EventType } from '../../../shared/enumeration/eventType';
import { mapPriceStatusBadge, PriceStatus } from '../../../shared/enumeration/goodPrice';
import { ModalType } from '../../../shared/enumeration/modalType';
import { RiskLevel, riskLevelArray } from '../../../shared/enumeration/riskLevel';
import useWindowDimensions from '../../../shared/hooks/useWindowDimensions';
import { RootState } from '../../../shared/reducers';
import { selectEntityById } from '../../assets/assets.reducer';
import { setLoginModalVisible } from '../../auth/auth.reducer';
import { getCurrentEntity } from '../../mini-stage/miniStages.api';
import { fetching as fetchingMiniStage } from '../../mini-stage/miniStages.reducer';
import { getEntity } from '../../productType/category.api';
import {
  fetching as fetchingCategory,
  selectEntityById as selectCategoryById,
} from '../../productType/category.reducer';
import { baseSetterArgs } from '../../transactions/settersMapping';
import { IProceedTxBody, proceedTransaction } from '../../transactions/transactions.api';
import { IUpdateBusinessPrice, storeBusinessPrice } from '../../transactions/transactions.reducer';
import { fetching } from '../../wallet/wallet.reducer';

interface IExtendOwnershipModal {
  listingId: number;
  isVisible: boolean;
  setVisibility: (visible: boolean) => void;
  title: string;
  modelType: ModalType.OWNERSHIP_EXTENSION | ModalType.OWNERSHIP_REGISTER;
}

interface IForecastValue {
  value: number;
  text: string;
  color: string;
}

type TMappingPriceStatusToText = { [key in PriceStatus]: string };

type TMappingSuccessRateToProfits = { [key in RiskLevel]: number };

type TMappingSuccessRate = { [key in RiskLevel]: IForecastValue };

type TModelTypeMappingMoment = { [key in ModalType.OWNERSHIP_EXTENSION | ModalType.OWNERSHIP_REGISTER]: moment.Moment };

interface IIntialValues {
  tokenAmount: number;
  startDate: moment.Moment;
  endDate: moment.Moment;
  dateCount: number;
  sellPrice: number | undefined;
  sellProfit: number;
  sellPriceStatus: PriceStatus;
  sellRiskLevel: RiskLevel;
  rentPrice: number | undefined;
  rentProfit: number;
  rentPriceStatus: PriceStatus;
  rentRiskLevel: RiskLevel;
}

interface IRiskValue {
  VERY_LOW: number;
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  VERY_HIGH: number;
}

const isCurrentDatePlusValueOverdue = (value: number, expiredDate: Moment) => {
  const currDate = moment();
  return currDate.add(value, 'day') <= expiredDate;
};

const USD_TO_VND_RATIO = 23300;

const ExtendOwnershipModal = (props: IExtendOwnershipModal) => {
  const { isVisible, setVisibility, listingId, title, modelType } = props;
  const dispatch = useDispatch();
  const { width: screenWidth } = useWindowDimensions();
  const formikRef = useRef<FormikProps<IIntialValues>>(null);
  const [focusedInput, setFocusedInput] = React.useState(null);

  const listing = useSelector(selectEntityById(listingId));
  const listingType = useSelector(selectCategoryById(listing?.typeId || ''));
  const { user } = useSelector((state: RootState) => state.authentication);
  const { signer, tokenBalance, signerAddress } = useSelector((state: RootState) => state.wallet);
  const { submitted } = useSelector((state: RootState) => state.transactions);

  const { t } = useTranslation();

  const [updatePriceBody, setUpdatePriceBody] = useState<IUpdateBusinessPrice | undefined>(undefined);
  const { initialState } = useSelector((state: RootState) => state.miniStages);
  const { currentEntity } = initialState;
  const ANFT_TO_USD_RATIO = currentEntity?.salePrice || 1;
  const ANFT_TO_VND_RATIO = ANFT_TO_USD_RATIO * USD_TO_VND_RATIO;

  const isSellCommercial = listing?.commercialTypes.includes(CommercialTypes.SELL);
  const isRentCommercial = listing?.commercialTypes.includes(CommercialTypes.RENT);

  const expiredLicenseDate = moment(listing?.licenseDate).add(listing?.licensePeriod, 'year');

  const isOwnershipExpired = (function () {
    if (!listing?.ownership || !listing.owner) return false;
    const viewerIsOwner = signerAddress === listing.owner;
    const ownershipExpired = checkOwnershipExpired(listing.ownership.toNumber());
    return viewerIsOwner && ownershipExpired;
  })();

  const ownershipAboutToExpire = (function () {
    if (!listing?.ownership) return false;
    return checkOwnershipAboutToExpire(listing.ownership.toNumber());
  })();

  const shouldDisplayUpdateBusinessPrice = (commercialType: CommercialTypes) => {
    const isRegisterModal = modelType === ModalType.OWNERSHIP_REGISTER;
    const isListingIncludesCommercialType =
      commercialType === CommercialTypes.SELL ? isSellCommercial : isRentCommercial;
    return isListingIncludesCommercialType && (isRegisterModal || isOwnershipExpired);
  };

  const closeModal = () => {
    setVisibility(false);
  };

  useEffect(() => {
    if (isVisible) {
      dispatch(fetchingMiniStage());
      dispatch(getCurrentEntity());
    } else {
      formikRef.current?.resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  useEffect(() => {
    if (submitted && updatePriceBody) {
      if (modelType === ModalType.OWNERSHIP_REGISTER || isOwnershipExpired) {
        if (modelType === ModalType.OWNERSHIP_REGISTER) {
          ToastSuccess(t('anftDapp.listingComponent.extendOwnership.registerOwnershipSuccess'));
        }
        dispatch(setLoginModalVisible(!user));
        dispatch(storeBusinessPrice(updatePriceBody));
      }
      setVisibility(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, JSON.stringify(updatePriceBody)]);

  useEffect(() => {
    if (listing?.typeId) {
      dispatch(fetchingCategory());
      dispatch(getEntity(listing.typeId));
    } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.typeId]);

  const aboutToExpire = listing?.ownership ? checkOwnershipAboutToExpire(listing.ownership.toNumber()) : false;

  const getStartDate = (): moment.Moment => {
    const currentDate = moment();
    const currentOwnership =
      listing?.ownership && !aboutToExpire ? moment.unix(listing.ownership.toNumber()) : moment();
    const modalTypeToStartDateMapping: TModelTypeMappingMoment = {
      [ModalType.OWNERSHIP_EXTENSION]: currentOwnership,
      [ModalType.OWNERSHIP_REGISTER]: currentDate,
    };
    return modalTypeToStartDateMapping[modelType];
  };

  const startDate = getStartDate();
  const endDate = moment(startDate).add(1, 'day').endOf('day');

  const commercialTypes = listing?.commercialTypes || [];
  const bothSellAndRentMethods = includeMultiple(commercialTypes, CommercialTypes.RENT, CommercialTypes.SELL);
  const onlyRentMethod = commercialTypes?.length === 1 && commercialTypes.includes(CommercialTypes.RENT);

  const getComercialTypesName = () => {
    if (bothSellAndRentMethods) {
      return 'SELL_RENT';
    }
    if (onlyRentMethod) {
      return 'RENT';
    }
    return 'SELL';
  };

  const initialValues: IIntialValues = {
    tokenAmount: 0,
    startDate,
    endDate,
    dateCount: calculateDateDifference(startDate, endDate),
    rentPrice: undefined,
    sellPrice: undefined,
    sellProfit: 0,
    sellPriceStatus: PriceStatus.LOW,
    sellRiskLevel: RiskLevel.VERY_HIGH,
    rentProfit: 0,
    rentPriceStatus: PriceStatus.LOW,
    rentRiskLevel: RiskLevel.VERY_HIGH,
  };

  const getExtenableDayFromTokenBalance = (): number => {
    if (!listing?.dailyPayment || !tokenBalance) return 0;
    if (!listing.dailyPayment.gt(0)) return 0;
    return tokenBalance.div(listing.dailyPayment).toNumber();
  };

  const calculateExtendPriceByDays = (days: number, startDate: moment.Moment) => {
    if (!startDate || !listing?.dailyPayment) return '0';
    const spending = listing.dailyPayment.mul(days);
    const differenceInSeconds = getSecondDifftoEndDate(startDate);
    const result =
      differenceInSeconds > 0
        ? calculateSpendingFromSecond(listing.dailyPayment, differenceInSeconds).add(spending)
        : spending;
    return convertBnToDecimal(result);
  };

  const validationSchema = Yup.object().shape({
    dateCount: Yup.number()
      .typeError(t('anftDapp.listingComponent.extendOwnership.incorrectInputType'))
      .min(1, t('anftDapp.listingComponent.extendOwnership.minimumOwnership'))
      .max(getExtenableDayFromTokenBalance(), t('anftDapp.listingComponent.extendOwnership.balanceIsNotEnough'))
      .required(t('anftDapp.listingComponent.extendOwnership.inputIsRequired'))
      .test(
        'dateCount-must-lt-period',
        t('anftDapp.listingComponent.extendOwnership.exceedingPeriod', { day: `${listing?.period}` }),
        function (value: number | undefined) {
          if (!value || !listing?.period) return true;
          return value <= listing.period;
        }
      )
      .test(
        'dateCount-must-lt-license',
        t('anftDapp.listingComponent.extendOwnership.exceedingLicenseExpirationDate', {
          day: `${expiredLicenseDate.format(APP_LOCAL_DATE_FORMAT)}`,
        }),
        function (value: number | undefined) {
          if (!value || !listing?.licensePeriod || !listing?.licenseDate) return true;
          return isCurrentDatePlusValueOverdue(value, expiredLicenseDate);
        }
      ),

    sellPrice: Yup.number()
      .test(
        'sellPrice-is-required',
        t(`anftDapp.listingComponent.extendOwnership.pleaseEnterSellPrice`),
        function (value: number | undefined) {
          if (!isSellCommercial || (modelType === ModalType.OWNERSHIP_EXTENSION && !isOwnershipExpired)) {
            return true;
          }
          return Number(value) >= 0;
        }
      )
      .typeError(t(`anftDapp.listingComponent.extendOwnership.sellPriceInvalid`))
      .min(
        listing?.minPrice || 1,
        t(`anftDapp.listingComponent.extendOwnership.sellPriceMustGreaterThanOrEqualToMinPrice`)
      )
      .max(
        listing?.maxPrice || 1,
        t(`anftDapp.listingComponent.extendOwnership.sellPriceMustLessThanOrEqualToMaxPrice`)
      ),
    rentPrice: Yup.number()
      .test(
        'rentPrice-is-required',
        t(`anftDapp.listingComponent.extendOwnership.pleaseEnterRentPrice`),
        function (value: number | undefined) {
          if (!isRentCommercial || (modelType === ModalType.OWNERSHIP_EXTENSION && !isOwnershipExpired)) {
            return true;
          }
          return Number(value) >= 0;
        }
      )
      .typeError(t(`anftDapp.listingComponent.extendOwnership.rentPriceInvalid`))
      .min(
        listing?.minRentCost || 1,
        t(`anftDapp.listingComponent.extendOwnership.rentPriceMustGreaterThanOrEqualToMinRentCost`)
      )
      .max(
        listing?.maxRentCost || 1,
        t(`anftDapp.listingComponent.extendOwnership.rentPriceMustLessThanOrEqualToMaxRentCost`)
      ),
  });

  const handleRawFormValues = (input: IIntialValues): IProceedTxBody => {
    if (!listing?.address) {
      throw Error('Error getting listing address');
    }
    if (!signer) {
      throw Error('No Signer found');
    }
    const instance = LISTING_INSTANCE({ address: listing.address, signer });
    if (!instance) {
      throw Error('Error in generating contract instance');
    }

    const extendPrice = convertDecimalToBn(calculateExtendPriceByDays(input.dateCount, input.startDate));

    const output: IProceedTxBody = {
      listingId,
      contract: instance,
      type: EventType.OWNERSHIP_EXTENSION,
      args: { ...baseSetterArgs, _amount: extendPrice },
    };

    return output;
  };

  // QLTSS
  const mappingSuccessRate: TMappingSuccessRate = {
    [RiskLevel.VERY_HIGH]: {
      value: 5,
      text: t('anftDapp.listingComponent.successLevel.VERY_HIGH'),
      color: 'danger',
    },
    [RiskLevel.HIGH]: {
      value: 25,
      text: t('anftDapp.listingComponent.successLevel.HIGH'),
      color: 'warning',
    },
    [RiskLevel.MEDIUM]: {
      value: 50,
      text: t('anftDapp.listingComponent.successLevel.MEDIUM'),
      color: 'primary',
    },
    [RiskLevel.LOW]: {
      value: 75,
      text: t('anftDapp.listingComponent.successLevel.LOW'),
      color: 'info',
    },
    [RiskLevel.VERY_LOW]: {
      value: 100,
      text: t('anftDapp.listingComponent.successLevel.VERY_LOW'),
      color: 'success',
    },
  };

  const listingData = {
    sellPrice: listing?.price && listing?.price > 0 ? listing?.price : 0,
    pricePerDay: listing?.fee && listing?.fee > 0 ? listing?.fee : 0,
    goodPrice: listing?.goodPrice && listing?.goodPrice > 0 ? listing?.goodPrice : 0,
    goodRentPrice: listing?.goodRentCost && listing?.goodRentCost > 0 ? listing?.goodRentCost : 0,
    rentPrice: listing?.rentCost && listing?.rentCost > 0 ? listing?.rentCost : 0,
    ratio: ANFT_TO_VND_RATIO,
    maximumStage: Number(listing?.durationRisk?.value) || 0,
    period: listing?.period || 0,
  };

  const getRiskValue = (type: RiskLevel): number => {
    const riskLevel = listingType?.risks.find((item) => item.type === type);
    return Number(riskLevel?.value || 0);
  };

  const getProfitsValue = (type: RiskLevel): number => {
    const riskLevel = listingType?.profits.find((item) => item.type === type);
    return Number(riskLevel?.value || 0);
  };

  const riskValue: IRiskValue = {
    VERY_LOW: getRiskValue(RiskLevel.VERY_LOW),
    LOW: getRiskValue(RiskLevel.LOW),
    MEDIUM: getRiskValue(RiskLevel.MEDIUM),
    HIGH: getRiskValue(RiskLevel.HIGH),
    VERY_HIGH: getRiskValue(RiskLevel.VERY_HIGH),
  };

  const profitsValue: IRiskValue = {
    VERY_LOW: getProfitsValue(RiskLevel.VERY_LOW),
    LOW: getProfitsValue(RiskLevel.LOW),
    MEDIUM: getProfitsValue(RiskLevel.MEDIUM),
    HIGH: getProfitsValue(RiskLevel.HIGH),
    VERY_HIGH: getProfitsValue(RiskLevel.VERY_HIGH),
  };

  const successRateForecast = (percent: number): RiskLevel => {
    if (percent <= riskValue.VERY_HIGH) {
      return RiskLevel.VERY_HIGH;
    }
    if (percent > riskValue.VERY_HIGH && percent <= riskValue.HIGH) {
      return RiskLevel.HIGH;
    }
    if (percent > riskValue.HIGH && percent <= riskValue.MEDIUM) {
      return RiskLevel.MEDIUM;
    }
    if (percent > riskValue.MEDIUM && percent <= riskValue.LOW) {
      return RiskLevel.LOW;
    }
    return RiskLevel.VERY_LOW;
  };

  const handleRiskProgressValue = (days: number): RiskLevel => {
    const percentRegistOnMaxStage = (days / listingData.maximumStage) * 100;
    const riskLevel = successRateForecast(percentRegistOnMaxStage);
    return riskLevel;
  };

  const mappingPriceStatusToText: TMappingPriceStatusToText = {
    [PriceStatus.LOW]: t('anftDapp.listingComponent.extendOwnership.priceStatus.LOW'),
    [PriceStatus.GOOD]: t('anftDapp.listingComponent.extendOwnership.priceStatus.GOOD'),
    [PriceStatus.HIGH]: t('anftDapp.listingComponent.extendOwnership.priceStatus.HIGH'),
  };

  const mappingSuccessRateToProfits: TMappingSuccessRateToProfits = {
    [RiskLevel.VERY_HIGH]: profitsValue.VERY_LOW,
    [RiskLevel.HIGH]: profitsValue.LOW,
    [RiskLevel.MEDIUM]: profitsValue.MEDIUM,
    [RiskLevel.LOW]: profitsValue.HIGH,
    [RiskLevel.VERY_LOW]: profitsValue.VERY_HIGH,
  };

  const calculateSellProfit = (price: number, risk: RiskLevel) => {
    const profit = mappingSuccessRateToProfits[risk];
    const ownerPrice = listingData.sellPrice;
    const profitPercent = profit / 100;
    const diff = price <= ownerPrice ? 0 : (price - ownerPrice) * profitPercent;
    return diff;
  };

  const calculateRentProfit = (price: number, days: number) => {
    const priceOf1Day = price / 30;
    const totalPriceOfDay = listingData.pricePerDay * days;
    const priceOfRentDay = priceOf1Day * days;
    const diff = priceOfRentDay > totalPriceOfDay ? priceOfRentDay - totalPriceOfDay : 0;
    return diff;
  };

  const calculateProfit = (price: number, risk: RiskLevel, days: number, commercialTypes: CommercialTypes) => {
    if (commercialTypes === CommercialTypes.SELL) {
      return calculateSellProfit(price, risk);
    } else {
      return calculateRentProfit(price, days);
    }
  };

  const checkPriceisGood = (price: number, commercialTypes: CommercialTypes): PriceStatus => {
    if (commercialTypes === CommercialTypes.SELL) {
      if (price <= listingData.sellPrice) return PriceStatus.LOW;
      if (listingData.sellPrice < price && price <= listingData.goodPrice) return PriceStatus.GOOD;
      return PriceStatus.HIGH;
    } else {
      if (price <= listingData.rentPrice) return PriceStatus.LOW;
      if (listingData.rentPrice < price && price <= listingData.goodRentPrice) return PriceStatus.GOOD;
      return PriceStatus.HIGH;
    }
  };

  const calculateProfitRatio = (days: number, profit: number): string => {
    if (!profit || !days) return t('anftDapp.listingComponent.extendOwnership.undefined');
    const totalInputDaysAmount = days * listingData.pricePerDay;
    const ratio = calculateRatio(totalInputDaysAmount, profit);
    return `${ratio.numerator} : ${insertCommas(ratio.denominator)}`;
  };

  const renderAmount = (amount: number): string => {
    if (moneyUnitTranslate(amount).unit) {
      return `${moneyUnitTranslate(amount).number} ${t(
        `anftDapp.global.moneyUnit.${moneyUnitTranslate(amount).unit}`
      )}`;
    }
    return insertCommas(amount);
  };

  const returnProfitPreview = (profit: number, dateCount: number, startDate: moment.Moment) => {
    if (!profit) return 0;
    const totalPayment = Number(calculateExtendPriceByDays(dateCount, startDate)) * ANFT_TO_VND_RATIO;
    return profit - totalPayment;
  };

  return (
    <CModal show={isVisible} onClose={closeModal} closeOnBackdrop={false} centered className="border-radius-modal">
      <CModalHeader className="justify-content-center">
        <CModalTitle className="modal-title-style">{title}</CModalTitle>
      </CModalHeader>
      <Formik
        innerRef={formikRef}
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={(rawValues) => {
          try {
            const value = handleRawFormValues(rawValues);
            dispatch(fetching());
            dispatch(proceedTransaction(value));

            const updatePriceBody: IUpdateBusinessPrice = {
              listingId: listingId.toString(),
              sellPrice: rawValues.sellPrice,
              rentPrice: rawValues.rentPrice,
            };
            setUpdatePriceBody(updatePriceBody);
          } catch (error) {
            console.log(`Error submitting form ${error}`);
            ToastError(`${t('anftDapp.global.errors.errorSubmittingForm')}: ${error}`);
          }
        }}
      >
        {({ values, errors, touched, setFieldValue, handleSubmit, setFieldTouched }) => (
          <CForm onSubmit={handleSubmit}>
            <CModalBody>
              <CRow>
                <CCol xs={12}>
                  {modelType === ModalType.OWNERSHIP_EXTENSION ? (
                    <CFormGroup row>
                      <CCol xs={7}>
                        <CLabel className="recharge-token-title">
                          {t('anftDapp.listingComponent.extendOwnership.currentOwnership')}
                        </CLabel>
                      </CCol>
                      <CCol xs={5}>
                        <p className="text-primary text-right m-0">
                          {listing?.ownership ? convertUnixToDate(listing.ownership.toNumber()) : '_'}
                        </p>
                      </CCol>
                    </CFormGroup>
                  ) : (
                    ''
                  )}

                  <CFormGroup row>
                    <CCol xs={7}>
                      <CLabel className="recharge-token-title">
                        {t('anftDapp.listingComponent.extendOwnership.dailyPayment')}
                      </CLabel>
                    </CCol>
                    <CCol xs={5}>
                      <p className="text-primary text-right m-0">
                        {formatBNToken(listing?.dailyPayment, true)}{' '}
                        <small className={'text-right text-muted'}>
                          (
                          {listing?.dailyPayment
                            ? insertCommas(Number(convertBnToDecimal(listing.dailyPayment)) * ANFT_TO_VND_RATIO)
                            : '_'}{' '}
                          VND)
                        </small>
                      </p>
                    </CCol>
                  </CFormGroup>
                  <CFormGroup row>
                    <CCol xs={6}>
                      <CLabel className="recharge-token-title">
                        {t('anftDapp.listingComponent.extendOwnership.tokenBalance')}
                      </CLabel>
                    </CCol>
                    <CCol xs={6}>
                      <p className="text-primary text-right m-0">{formatBNToken(tokenBalance, true)}</p>
                    </CCol>
                  </CFormGroup>
                  <CFormGroup row>
                    <CCol xs={6}>
                      <CLabel className="recharge-token-title">
                        {t('anftDapp.listingComponent.extendOwnership.comercialType')}:
                      </CLabel>
                    </CCol>
                    <CCol xs={6}>
                      <p className="text-primary text-right m-0">
                        {t(`anftDapp.listingComponent.methods.${getComercialTypesName()}`)}
                      </p>
                    </CCol>
                  </CFormGroup>

                  <CFormGroup row className={`${screenWidth <= 335 ? 'd-none' : ''}`}>
                    <CCol xs={12} className="d-flex justify-content-between">
                      <CLabel className="recharge-token-title">
                        {t('anftDapp.listingComponent.withdrawToken.ownershipRange')}
                      </CLabel>
                      <CLabel className="recharge-token-title">
                        {t('anftDapp.listingComponent.extendOwnership.maximumStage')}: {listing?.period}{' '}
                        {t('anftDapp.listingComponent.withdrawToken.days')}
                      </CLabel>
                    </CCol>
                    <CCol xs={12}>
                      <DateRangePicker
                        startDate={values.startDate}
                        startDateId="startDate"
                        disabled="startDate"
                        displayFormat="DD/MM/YYYY"
                        endDate={values.endDate}
                        endDateId="endDate"
                        onDatesChange={({ startDate, endDate }) => {
                          if (focusedInput === 'endDate' && endDate && startDate) {
                            setFieldValue('endDate', endDate.endOf('day'));
                            const dateCount = calculateDateDifference(startDate, endDate);
                            setFieldValue('dateCount', dateCount);
                          }
                        }}
                        focusedInput={focusedInput}
                        onFocusChange={setFocusedInput as any}
                        isOutsideRange={(day) => {
                          const startDateObj = moment(startDate).startOf('day');
                          const endDateObj = moment(startDate)
                            .add(getExtenableDayFromTokenBalance(), 'day')
                            .endOf('day');
                          return !checkDateRange(day, startDateObj, endDateObj);
                        }}
                        initialVisibleMonth={() => moment(startDate).add(0, 'month')}
                        numberOfMonths={1}
                        orientation={'horizontal'}
                      />
                    </CCol>
                  </CFormGroup>
                  <CFormGroup row>
                    <CCol xs={6}>
                      <CLabel className="recharge-token-title">
                        {t('anftDapp.listingComponent.withdrawToken.days')}
                      </CLabel>
                      <CInput
                        onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                          const extendDay = Number(unInsertCommas(e.target.value));
                          const currRiskLevel = handleRiskProgressValue(Number(e.currentTarget.value));

                          const riskLevelInx = riskLevelArray.indexOf(currRiskLevel);
                          const findPrevRisk =
                            currRiskLevel !== RiskLevel.VERY_HIGH ? riskLevelArray[riskLevelInx + 1] : currRiskLevel;
                          const sellRiskLevel =
                            values.sellPriceStatus === PriceStatus.HIGH ? findPrevRisk : currRiskLevel;
                          const rentRiskLevel =
                            values.rentPriceStatus === PriceStatus.HIGH ? findPrevRisk : currRiskLevel;

                          const sellProfit = calculateProfit(
                            values.sellPrice || 0,
                            sellRiskLevel,
                            extendDay,
                            CommercialTypes.SELL
                          );
                          const rentProfit = calculateProfit(
                            values.rentPrice || 0,
                            rentRiskLevel,
                            extendDay,
                            CommercialTypes.RENT
                          );
                          try {
                            BigNumber.from(extendDay);
                            const extendDate = moment(startDate).add(
                              returnMaxEndDate(extendDay, getExtenableDayFromTokenBalance()),
                              'day'
                            );
                            await setFieldValue('sellProfit', sellProfit);
                            await setFieldValue('rentProfit', rentProfit);
                            await setFieldValue('sellRiskLevel', sellRiskLevel);
                            await setFieldValue('rentRiskLevel', rentRiskLevel);
                            setFieldValue('dateCount', extendDay);
                            setFieldValue('endDate', extendDate);
                          } catch (err) {
                            errors.dateCount = `${t('anftDapp.listingComponent.extendOwnership.balanceIsNotEnough')}`;
                          }
                        }}
                        id="dateCount"
                        autoComplete="off"
                        name="dateCount"
                        value={values.dateCount ? insertCommas(values.dateCount) : ''}
                        className="btn-radius-50"
                      />
                    </CCol>
                    <CCol xs={6} className="spending-estimation text-right">
                      <CLabel className="recharge-token-title">
                        {t('anftDapp.listingComponent.extendOwnership.spendingEstimation')}
                      </CLabel>
                      <CInput
                        value={`${
                          values.dateCount > 0 && values.startDate
                            ? insertCommas(calculateExtendPriceByDays(values.dateCount, values.startDate))
                            : '0'
                        } ANFT`}
                        className="btn-radius-50"
                        disabled
                      />
                    </CCol>
                    <CCol xs={12} className="mt-2">
                      <CInvalidFeedback className={errors.dateCount && touched.dateCount ? 'd-block' : 'd-none'}>
                        {errors.dateCount}
                      </CInvalidFeedback>
                      <CFormText>
                        {(modelType === ModalType.OWNERSHIP_REGISTER && !ownershipAboutToExpire) ||
                        !listing?.ownership ||
                        isOwnershipExpired
                          ? t('anftDapp.listingComponent.extendOwnership.registerOwnershipNoticeText', {
                              day: `${values.endDate.format(APP_LOCAL_DATE_FORMAT)}`,
                            })
                          : t('anftDapp.listingComponent.extendOwnership.extendOwnershipNoticeText', {
                              expiredDay: `${moment.unix(listing.ownership.toNumber()).format(APP_LOCAL_DATE_FORMAT)}`,
                              day: `${values.endDate.format(APP_LOCAL_DATE_FORMAT)}`,
                            })}
                      </CFormText>
                      <CFormText>
                        <p className={`text-danger m-0`}>
                          {t('anftDapp.global.modal.noticeText', {
                            aboutToExpire: `${moment(values.endDate).subtract(1, 'd').format(APP_LOCAL_DATE_FORMAT)}`,
                            expired: `${values.endDate.format(APP_LOCAL_DATE_FORMAT)}`,
                          })}
                        </p>
                      </CFormText>
                    </CCol>
                  </CFormGroup>

                  {user ? (
                    user.walletAddress !== signerAddress ? (
                      <CFormGroup
                        row
                        className={`border-top mb-2 ${
                          modelType !== ModalType.OWNERSHIP_REGISTER && !isOwnershipExpired ? 'd-none' : ''
                        }`}
                      >
                        <CCol xs={12} className="mt-2">
                          <small className="text-warning">
                            <CIcon name="cil-warning" className="mr-1" />
                            {t(`anftDapp.listingComponent.extendOwnership.warningAccountLoggedInNotMatch`)}
                          </small>
                        </CCol>
                      </CFormGroup>
                    ) : (
                      ''
                    )
                  ) : (
                    <CFormGroup
                      row
                      className={`border-top mb-2 ${
                        modelType !== ModalType.OWNERSHIP_REGISTER && !isOwnershipExpired ? 'd-none' : ''
                      }`}
                    >
                      <CCol xs={12} className="mt-2">
                        <small className="text-info">
                          <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
                          {t('anftDapp.listingComponent.extendOwnership.loginRemAccountToUpdateSecondaryPrice')}
                        </small>
                      </CCol>
                    </CFormGroup>
                  )}

                  {shouldDisplayUpdateBusinessPrice(CommercialTypes.SELL) ? (
                    <>
                      <CFormGroup row>
                        <CCol xs={12}>
                          <CLabel className="recharge-token-title">
                            {t(`anftDapp.listingComponent.extendOwnership.secondaryPrice`)} (VND):
                          </CLabel>
                        </CCol>
                        <CCol xs={12}>
                          <CInput
                            id="sellPrice"
                            name="sellPrice"
                            className="btn-radius-50"
                            type="text"
                            onChange={async (e: React.FormEvent<HTMLInputElement>) => {
                              manualCaretPosition(e);
                              const priceStatus = checkPriceisGood(
                                Number(unInsertCommas(e.currentTarget.value)),
                                CommercialTypes.SELL
                              );
                              const currRiskLevel = handleRiskProgressValue(values.dateCount);
                              const riskLevelInx = riskLevelArray.indexOf(currRiskLevel);
                              const findPrevRisk =
                                currRiskLevel !== RiskLevel.VERY_HIGH
                                  ? riskLevelArray[riskLevelInx + 1]
                                  : currRiskLevel;
                              const sellRiskLevel = priceStatus === PriceStatus.HIGH ? findPrevRisk : currRiskLevel;
                              const profit = calculateProfit(
                                Number(unInsertCommas(e.currentTarget.value)),
                                sellRiskLevel,
                                values.dateCount,
                                CommercialTypes.SELL
                              );
                              await setFieldValue('sellPrice', unInsertCommas(e.currentTarget.value).trim());
                              setFieldValue('sellPriceStatus', priceStatus);
                              setFieldValue('sellProfit', profit);
                              setFieldValue('sellRiskLevel', sellRiskLevel);
                              setFieldTouched('sellPrice', true);
                            }}
                            value={insertCommas(values.sellPrice)}
                          />
                          {/* <CFormText>
                            {t('anftDapp.listingComponent.extendOwnership.exchange')}:{' '}
                            {renderAmount((values.sellPrice || 0) / ANFT_TO_VND_RATIO)} ANFT
                          </CFormText> */}
                          <CInvalidFeedback className={errors.sellPrice && touched.sellPrice ? 'd-block' : 'd-none'}>
                            {errors.sellPrice}
                          </CInvalidFeedback>

                          {values.sellPrice && !errors.sellPrice ? (
                            <CFormText>
                              <p className={`m-0 text-${mapPriceStatusBadge[values.sellPriceStatus]}`}>
                                {mappingPriceStatusToText[values.sellPriceStatus]}
                              </p>
                            </CFormText>
                          ) : (
                            ''
                          )}
                        </CCol>
                      </CFormGroup>

                      <CFormGroup row>
                        <CCol xs={5}>
                          <CLabel className="recharge-token-title">
                            {t('anftDapp.listingComponent.extendOwnership.revenue')}:
                          </CLabel>
                        </CCol>
                        <CCol xs={7}>
                          <p className="text-primary text-right m-0">
                            {values.sellProfit ? insertCommas(values.sellProfit) : '0'} VND{' '}
                            <small className="text-muted">
                              ({values.sellProfit ? renderAmount(Number(values.sellProfit) / ANFT_TO_VND_RATIO) : '0'}{' '}
                              ANFT)
                            </small>
                          </p>
                        </CCol>
                      </CFormGroup>

                      <CFormGroup row>
                        <CCol xs={5}>
                          <CLabel className="recharge-token-title">
                            {t('anftDapp.listingComponent.extendOwnership.profit')}:
                          </CLabel>
                        </CCol>
                        <CCol xs={7}>
                          <p className="text-primary text-right m-0">
                            {values.sellProfit
                              ? insertCommas(
                                  returnProfitPreview(Number(values.sellProfit), values.dateCount, values.startDate)
                                )
                              : '0'}{' '}
                            VND{' '}
                            <small className="text-muted">
                              (
                              {values.sellProfit
                                ? renderAmount(
                                    Number(
                                      returnProfitPreview(Number(values.sellProfit), values.dateCount, values.startDate)
                                    ) / ANFT_TO_VND_RATIO
                                  )
                                : '0'}{' '}
                              ANFT)
                            </small>
                          </p>
                        </CCol>
                      </CFormGroup>
                      {values.sellPrice && !errors.sellPrice ? (
                        <>
                          <CFormGroup row>
                            <CCol xs={12}>
                              <CLabel className="recharge-token-title">
                                {t('anftDapp.listingComponent.extendOwnership.successRate')}:
                              </CLabel>
                            </CCol>
                            <CCol xs={12}>
                              <CProgress>
                                <CProgressBar
                                  value={mappingSuccessRate[values.sellRiskLevel].value}
                                  color={mappingSuccessRate[values.sellRiskLevel].color}
                                />
                              </CProgress>
                              <small className={`text-${mappingSuccessRate[values.sellRiskLevel].color}`}>
                                {mappingSuccessRate[values.sellRiskLevel].text}
                              </small>
                            </CCol>
                          </CFormGroup>
                          <CFormGroup row>
                            <CCol xs={4}>
                              <CLabel className="recharge-token-title">
                                {t('anftDapp.listingComponent.extendOwnership.profitRatio')}:
                              </CLabel>
                            </CCol>
                            <CCol xs={8}>
                              <p className="text-primary text-right m-0">
                                {calculateProfitRatio(
                                  values.dateCount,
                                  returnProfitPreview(Number(values.sellProfit), values.dateCount, values.startDate)
                                )}
                              </p>
                            </CCol>
                          </CFormGroup>
                        </>
                      ) : (
                        ''
                      )}
                    </>
                  ) : (
                    ''
                  )}

                  {shouldDisplayUpdateBusinessPrice(CommercialTypes.RENT) ? (
                    <>
                      <CFormGroup row className={`border-top pt-2`}>
                        <CCol xs={12}>
                          <CLabel className="recharge-token-title">
                            {t(`anftDapp.listingComponent.extendOwnership.secondaryRent`)} (VND):
                          </CLabel>
                        </CCol>
                        <CCol xs={12}>
                          <CInput
                            id="rentPrice"
                            name="rentPrice"
                            className="btn-radius-50"
                            type="text"
                            onChange={async (e: React.FormEvent<HTMLInputElement>) => {
                              manualCaretPosition(e);
                              const priceStatus = checkPriceisGood(
                                Number(unInsertCommas(e.currentTarget.value)),
                                CommercialTypes.RENT
                              );
                              const currRiskLevel = handleRiskProgressValue(values.dateCount);
                              const riskLevelInx = riskLevelArray.indexOf(currRiskLevel);
                              const findPrevRisk =
                                currRiskLevel !== RiskLevel.VERY_HIGH
                                  ? riskLevelArray[riskLevelInx + 1]
                                  : currRiskLevel;
                              const rentRiskLevel = priceStatus === PriceStatus.HIGH ? findPrevRisk : currRiskLevel;
                              const profit = calculateProfit(
                                Number(unInsertCommas(e.currentTarget.value)),
                                rentRiskLevel,
                                values.dateCount,
                                CommercialTypes.RENT
                              );
                              await setFieldValue('rentPrice', unInsertCommas(e.currentTarget.value).trim());
                              setFieldValue('rentPriceStatus', priceStatus);
                              setFieldValue('rentProfit', profit);
                              setFieldValue('rentRiskLevel', rentRiskLevel);
                              setFieldTouched('rentPrice', true);
                            }}
                            value={insertCommas(values.rentPrice)}
                          />
                          {/* <CFormText>
                            {t('anftDapp.listingComponent.extendOwnership.exchange')}:{' '}
                            {renderAmount((values.rentPrice || 0) / ANFT_TO_VND_RATIO)} ANFT
                          </CFormText> */}
                          <CInvalidFeedback className={errors.rentPrice && touched.rentPrice ? 'd-block' : 'd-none'}>
                            {errors.rentPrice}
                          </CInvalidFeedback>

                          {values.rentPrice && !errors.rentPrice ? (
                            <CFormText>
                              <p className={`m-0 text-${mapPriceStatusBadge[values.rentPriceStatus]}`}>
                                {mappingPriceStatusToText[values.rentPriceStatus]}
                              </p>
                            </CFormText>
                          ) : (
                            ''
                          )}
                        </CCol>
                      </CFormGroup>

                      <CFormGroup row>
                        <CCol xs={5}>
                          <CLabel className="recharge-token-title">
                            {t('anftDapp.listingComponent.extendOwnership.revenuePerMonth')}:
                          </CLabel>
                        </CCol>
                        <CCol xs={7}>
                          <p className="text-primary text-right m-0">
                            {values.rentPrice ? insertCommas(values.rentPrice) : '0'} VND{' '}
                            <small className="text-muted">
                              ({values.rentPrice ? renderAmount(Number(values.rentPrice) / ANFT_TO_VND_RATIO) : '0'}{' '}
                              ANFT)
                            </small>
                          </p>
                        </CCol>
                      </CFormGroup>

                      <CFormGroup row>
                        <CCol xs={5}>
                          <CLabel className="recharge-token-title">
                            {t('anftDapp.listingComponent.extendOwnership.profitPerMonth')}:
                          </CLabel>
                        </CCol>
                        <CCol xs={7}>
                          <p className="text-primary text-right m-0">
                            {values.rentProfit
                              ? insertCommas(returnProfitPreview(Number(values.rentPrice), 30, values.startDate))
                              : '0'}{' '}
                            VND{' '}
                            <small className="text-muted">
                              (
                              {values.rentProfit
                                ? renderAmount(
                                    returnProfitPreview(Number(values.rentPrice), 30, values.startDate) /
                                      ANFT_TO_VND_RATIO
                                  )
                                : '0'}{' '}
                              ANFT)
                            </small>
                          </p>
                        </CCol>
                      </CFormGroup>
                      {values.rentPrice && !errors.rentPrice ? (
                        <>
                          <CFormGroup row>
                            <CCol xs={12}>
                              <CLabel className="recharge-token-title">
                                {t('anftDapp.listingComponent.extendOwnership.successRate')}:
                              </CLabel>
                            </CCol>
                            <CCol xs={12}>
                              <CProgress>
                                <CProgressBar
                                  value={mappingSuccessRate[values.rentRiskLevel].value}
                                  color={mappingSuccessRate[values.rentRiskLevel].color}
                                />
                              </CProgress>
                              <small className={`text-${mappingSuccessRate[values.rentRiskLevel].color}`}>
                                {mappingSuccessRate[values.rentRiskLevel].text}
                              </small>
                            </CCol>
                          </CFormGroup>
                          <CFormGroup row>
                            <CCol xs={4}>
                              <CLabel className="recharge-token-title">
                                {t('anftDapp.listingComponent.extendOwnership.profitRatio')}:
                              </CLabel>
                            </CCol>
                            <CCol xs={8}>
                              <p className="text-primary text-right m-0">
                                {calculateProfitRatio(
                                  30,
                                  returnProfitPreview(Number(values.rentPrice), 30, values.startDate)
                                )}
                              </p>
                            </CCol>
                          </CFormGroup>
                        </>
                      ) : (
                        ''
                      )}
                    </>
                  ) : (
                    ''
                  )}
                </CCol>
              </CRow>
            </CModalBody>
            <CModalFooter className="justify-content-between">
              <CCol>
                <CButton
                  className="px-2 w-100 btn-font-style btn-radius-50 btn btn-outline-primary"
                  onClick={closeModal}
                >
                  {t('anftDapp.global.modal.cancel')}
                </CButton>
              </CCol>
              <CCol>
                <CButton className="px-2 w-100 btn btn-primary btn-font-style btn-radius-50" type="submit">
                  {t('anftDapp.global.modal.confirm')}
                </CButton>
              </CCol>
            </CModalFooter>
          </CForm>
        )}
      </Formik>
    </CModal>
  );
};

export default ExtendOwnershipModal;
