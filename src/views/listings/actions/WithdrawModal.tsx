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
  CRow,
} from '@coreui/react';
import { Formik, FormikProps } from 'formik';
import moment from 'moment';
import React, { useEffect, useRef } from 'react';
import { DateRangePicker } from 'react-dates';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';
import { LISTING_INSTANCE } from '../../../shared/blockchain-helpers';
import {
  calculateDateDifference,
  checkDateRange,
  convertBnToDecimal,
  convertDecimalToBn,
  insertCommas,
  returnMaxEndDate,
  unInsertCommas,
} from '../../../shared/casual-helpers';
import { ToastError } from '../../../shared/components/Toast';
import { EventType } from '../../../shared/enumeration/eventType';
import useWindowDimensions from '../../../shared/hooks/useWindowDimensions';
import { RootState } from '../../../shared/reducers';
import { selectEntityById } from '../../assets/assets.reducer';
import { baseSetterArgs } from '../../transactions/settersMapping';
import { IProceedTxBody, proceedTransaction } from '../../transactions/transactions.api';
import { fetching } from '../../transactions/transactions.reducer';

interface IWithdrawModal {
  listingId: number;
  isVisible: boolean;
  setVisibility: (visible: boolean) => void;
}

interface IIntialValues {
  tokenAmount: number;
  startDate: moment.Moment;
  endDate: moment.Moment;
  remainingDays: number;
  withdraw: number;
}

const WithdrawModal = (props: IWithdrawModal) => {
  const { isVisible, setVisibility, listingId } = props;
  const dispatch = useDispatch();
  const { width: screenWidth } = useWindowDimensions();
  const formikRef = useRef<FormikProps<IIntialValues>>(null);
  const [focusedInput, setFocusedInput] = React.useState(null);

  const listing = useSelector(selectEntityById(listingId));
  const { signer } = useSelector((state: RootState) => state.wallet);
  const { submitted } = useSelector((state: RootState) => state.transactions);

  const { t } = useTranslation();

  const closeModal = () => {
    setVisibility(false);
  };

  const getEndDate = (): moment.Moment => {
    const currentDate = moment().add(1, 'day').endOf('day');
    const currentOwnership = listing?.ownership ? moment.unix(listing.ownership.toNumber()) : currentDate;
    return currentOwnership;
  };

  const startDate = moment();
  const endDate = getEndDate();
  const totalDays = calculateDateDifference(startDate, endDate);

  const initialValues: IIntialValues = {
    tokenAmount: 0,
    startDate,
    endDate,
    remainingDays: totalDays,
    withdraw: 0,
  };

  // const exceedingWithdrawErr = `Số ngày rút ra không vượt quá ${totalDays - 1} ngày`;
  const validationSchema = Yup.object().shape({
    withdraw: Yup.number()
      .typeError(t('anftDapp.listingComponent.withdrawToken.incorrectInputType'))
      .min(1, t('anftDapp.listingComponent.withdrawToken.minimumWithdraw'))
      .max(
        totalDays - 1,
        t('anftDapp.listingComponent.withdrawToken.exceedingWithdrawErr', { amount: `${totalDays - 1}` })
      )
      .required(t('anftDapp.listingComponent.withdrawToken.inputIsRequired')),
  });

  const calculateWithdrawPriceByDays = (days: number) => {
    if (!listing?.dailyPayment) return '0';
    const spending = listing.dailyPayment.mul(days);
    return convertBnToDecimal(spending);
  };

  const handleRawFormValues = (input: IIntialValues): IProceedTxBody => {
    if (!listing?.address) {
      throw Error('Error getting listing address');
    }
    if (!signer) {
      throw Error('No Signer found');
    }
    const instance = LISTING_INSTANCE({ address: listing.address, signer });
    if (!instance) {
      throw Error('Error in generating contract instace');
    }

    const withdrawPrice = convertDecimalToBn(calculateWithdrawPriceByDays(input.withdraw));

    const output: IProceedTxBody = {
      listingId,
      contract: instance,
      type: EventType.WITHDRAW,
      args: { ...baseSetterArgs, _amount: withdrawPrice },
    };

    return output;
  };

  useEffect(() => {
    if (submitted) {
      setVisibility(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  useEffect(() => {
    if (!isVisible) {
      formikRef.current?.resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  return (
    <CModal show={isVisible} onClose={closeModal} closeOnBackdrop={false} centered className="border-radius-modal">
      <CModalHeader className="justify-content-center">
        <CModalTitle className="modal-title-style">
          {t('anftDapp.listingComponent.primaryInfo.ownershipManagement.withdrawToken')}
        </CModalTitle>
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
          } catch (error) {
            console.log(`Error submitting form ${error}`);
            ToastError(`${t('anftDapp.global.errors.errorSubmittingForm')}: ${error}`);
          }
        }}
      >
        {({ values, errors, touched, handleSubmit, handleBlur, setFieldValue, submitForm }) => (
          <CForm onSubmit={handleSubmit}>
            <CModalBody>
              <CRow>
                <CCol xs={12}>
                  <CFormGroup row>
                    <CCol xs={6}>
                      <CLabel className="withdraw-token-title">
                        {t('anftDapp.listingComponent.withdrawToken.maximumWithdrawable')}
                      </CLabel>
                    </CCol>
                    <CCol xs={6}>
                      <p className="text-primary text-right">
                        {totalDays - 1} {t('anftDapp.listingComponent.withdrawToken.days')}
                      </p>
                    </CCol>
                  </CFormGroup>
                  <CFormGroup row className={`${screenWidth <= 335 ? 'd-none' : ''}`}>
                    <CCol xs={12}>
                      <CLabel className="recharge-token-title">
                        {t('anftDapp.listingComponent.withdrawToken.ownershipRange')}
                      </CLabel>
                    </CCol>
                    <CCol xs={12}>
                      {/* Check screen width here */}
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
                            const remainingDays = calculateDateDifference(startDate, endDate);
                            const withDraw = totalDays - remainingDays;
                            setFieldValue('remainingDays', remainingDays);
                            setFieldValue('withdraw', withDraw);
                          }
                        }}
                        focusedInput={focusedInput}
                        onFocusChange={setFocusedInput as any}
                        isOutsideRange={(day) => {
                          const startDateObj = moment(startDate).startOf('day');
                          const endDateObj = moment(endDate).endOf('day');
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
                        {t('anftDapp.listingComponent.withdrawToken.withdrawDays')}
                      </CLabel>
                      <CInput
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const withdrawDay = Number(unInsertCommas(e.target.value));
                          setFieldValue('withdraw', withdrawDay);
                          const remainingDays = totalDays - withdrawDay;
                          if (remainingDays > 0) {
                            const extendValue = moment(startDate).add(
                              returnMaxEndDate(remainingDays, totalDays),
                              'day'
                            );
                            setFieldValue('remainingDays', remainingDays);
                            setFieldValue('endDate', extendValue);
                          } else {
                            const extendValue = moment(startDate);
                            setFieldValue('remainingDays', '0');
                            setFieldValue('endDate', extendValue);
                          }
                        }}
                        id="withdraw"
                        autoComplete="off"
                        name="withdraw"
                        value={values.withdraw ? insertCommas(values.withdraw) : ''}
                        className="btn-radius-50"
                      />
                    </CCol>
                    <CCol xs={6} className="spending-estimation text-right">
                      <CLabel className="recharge-token-title">
                        {t('anftDapp.listingComponent.withdrawToken.returnEstimation')}
                      </CLabel>
                      <CInput
                        value={`${
                          values.withdraw > 0 && values.startDate && Number(values.remainingDays)
                            ? insertCommas(calculateWithdrawPriceByDays(values.withdraw))
                            : '0'
                        } ANFT`}
                        className="btn-radius-50"
                        disabled
                      />
                    </CCol>
                    <CCol xs={12} className="mt-2">
                      <CInvalidFeedback className={errors.withdraw && touched.withdraw ? 'd-block' : 'd-none'}>
                        {errors.withdraw ||
                          t('anftDapp.listingComponent.withdrawToken.exceedingWithdrawErr', {
                            amount: `${totalDays - 1}`,
                          })}
                      </CInvalidFeedback>
                      <CFormText>{t('anftDapp.listingComponent.withdrawToken.noticeText')}</CFormText>
                    </CCol>
                  </CFormGroup>
                  <CFormGroup row className={`mb-0`}>
                    <CCol xs={6}>
                      <CLabel className="withdraw-token-title">
                        {t('anftDapp.listingComponent.withdrawToken.remainingDays')}
                      </CLabel>
                    </CCol>
                    <CCol xs={6}>
                      <p className="text-primary text-right">
                        {values.remainingDays} {t('anftDapp.listingComponent.withdrawToken.days')}
                      </p>
                    </CCol>
                  </CFormGroup>
                </CCol>
              </CRow>
            </CModalBody>
            <CModalFooter className="justify-content-between">
              <CCol>
                <CButton
                  className="px-2 w-100 btn-font-style btn btn-outline-primary btn-radius-50"
                  onClick={closeModal}
                >
                  {t('anftDapp.global.modal.cancel')}
                </CButton>
              </CCol>
              <CCol>
                <CButton className="px-2 w-100 btn btn-primary btn-font-style btn-radius-50" onClick={submitForm}>
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

export default WithdrawModal;
