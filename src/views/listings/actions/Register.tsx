import CIcon from '@coreui/icons-react';
import {
  CButton,
  CCard,
  CCardBody,
  CCardTitle,
  CCol,
  CCollapse,
  CContainer,
  CDataTable,
  CForm,
  CFormGroup,
  CInput,
  CInputGroup,
  CInputGroupAppend,
  CInvalidFeedback,
  CLabel,
  CLink,
  CRow,
  CTooltip,
} from '@coreui/react';
import { faInfoCircle, faPen, faSyncAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { BigNumber } from 'ethers';
import { Formik, FormikProps } from 'formik';
import moment from 'moment';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';
import * as Yup from 'yup';
import { calculateStakeHolderReward, ICalSHReward, LISTING_INSTANCE } from '../../../shared/blockchain-helpers';
import {
  convertBnToDecimal,
  convertDecimalToBn,
  convertUnixToDate,
  formatBNToken,
  insertCommas,
  returnTheFirstImage,
  unInsertCommas,
} from '../../../shared/casual-helpers';
import ConfirmationLoading from '../../../shared/components/ConfirmationLoading';
import ConfirmModal from '../../../shared/components/ConfirmModal';
import InfoLoader from '../../../shared/components/InfoLoader';
import SubmissionModal from '../../../shared/components/SubmissionModal';
import { ToastError, ToastInfo } from '../../../shared/components/Toast';
import { EventType } from '../../../shared/enumeration/eventType';
import { ModalType, TModalsVisibility } from '../../../shared/enumeration/modalType';
import useDeviceDetect from '../../../shared/hooks/useDeviceDetect';
import useWindowDimensions from '../../../shared/hooks/useWindowDimensions';
import { IOption } from '../../../shared/models/options.model';
import { RootState } from '../../../shared/reducers';
import { getEntity, getOptionsWithStakes } from '../../assets/assets.api';
import { fetchingEntity, selectEntityById, softReset } from '../../assets/assets.reducer';
import { baseSetterArgs } from '../../transactions/settersMapping';
import { IProceedTxBody, proceedTransaction } from '../../transactions/transactions.api';
import { fetching, hardReset } from '../../transactions/transactions.reducer';
import '../index.scss';
import Listings from '../Listings';

interface IRegisterParams {
  [x: string]: string;
}
interface IRegister {
  registerAmount: number;
}

const titleTableStyle = {
  textAlign: 'left',
  color: '#828282',
  fontSize: '0.875rem',
  lineHeight: '16px',
  fontWeight: '400',
};

interface IRegisterProps extends RouteComponentProps<IRegisterParams> {}

const Register = (props: IRegisterProps) => {
  const { match, history } = props;
  const { id } = match.params;

  const dispatch = useDispatch();
  const formikRef = useRef<FormikProps<IRegister>>(null);

  const { t } = useTranslation();

  const { isMobile } = useDeviceDetect();

  const registerView = [
    {
      key: 'activityName',
      _style: titleTableStyle,
      label: `${t('anftDapp.registerComponent.activity')}`,
    },
    {
      key: 'reward',
      _style: titleTableStyle,
      label: `${t('anftDapp.registerComponent.reward')}`,
    },
    {
      key: 'registerAmount',
      _style: titleTableStyle,
      label: `${t('anftDapp.registerComponent.registerAmount')}`,
    },
  ];

  const { signerAddress, signer, provider } = useSelector((state: RootState) => state.wallet);

  const { initialState } = useSelector((state: RootState) => state.assets);
  const { tokenBalance } = useSelector((state: RootState) => state.wallet);
  const { success, submitted, loading } = useSelector((state: RootState) => state.transactions);

  const { entityLoading, fetchEntitySuccess, updateEntitySuccess } = initialState;

  const listing = useSelector(selectEntityById(Number(id)));

  const { width: screenWidth } = useWindowDimensions();

  const [details, setDetails] = useState<string[]>([]);

  const toggleDetails = (reqId: string) => {
    proceedCalculation(Number(reqId)).then((res) => setAmountToReturn(res));

    const position = details.indexOf(reqId);
    let newDetails = details.slice();
    if (position !== -1) {
      newDetails.splice(position, 1);
    } else {
      newDetails = [reqId];
    }

    setDetails(newDetails);
    setChosenOptionId(undefined);
    setIsEditingRegister(false);
    setInitialRegisterAmount(undefined);
    formikRef.current?.resetForm();
  };

  const initialModalState: TModalsVisibility = {
    [ModalType.OWNERSHIP_EXTENSION]: false,
    [ModalType.OWNERSHIP_WITHDRAW]: false,
    [ModalType.OWNERSHIP_REGISTER]: false,
    [ModalType.REWARD_CLAIM]: false,
    [ModalType.REWARD_UNREGISTER]: false,
  };

  const [modalsVisibility, setModalVisibility] = useState<TModalsVisibility>(initialModalState);

  const handleModalVisibility = (type: ModalType, isVisible: boolean) => {
    setModalVisibility({ ...initialModalState, [type]: isVisible });
  };

  const handleRawFormValues = (input: IRegister, optionId: number): IProceedTxBody => {
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

    const output: IProceedTxBody = {
      listingId: Number(id),
      contract: instance,
      type: EventType.REGISTER,
      args: {
        ...baseSetterArgs,
        _amount: convertDecimalToBn(input.registerAmount.toString()),
        _optionId: optionId,
      },
    };
    return output;
  };

  const validationSchema = Yup.object().shape({
    registerAmount: Yup.number()
      .test('stake-unchange', t('anftDapp.registerComponent.inputAmountIsUnchange'), function (value) {
        if (!value) return true;
        return value !== initialRegisterAmount;
      })
      .test(
        'do-not-exceed-tokenBalance',
        t('anftDapp.registerComponent.inputAmountExceedsTokenBalance'),
        function (value) {
          if (!value) return true;
          if (!tokenBalance) return true;
          return convertDecimalToBn(String(value)).lte(tokenBalance);
        }
      )
      .typeError(t('anftDapp.registerComponent.incorrectInputType'))
      .required(t('anftDapp.registerComponent.inputIsRequired'))
      .min(1, t('anftDapp.registerComponent.minimumRegister')),
  });

  const createTxBodyBaseOnType = (optionId: number, type: EventType) => {
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

    const output: IProceedTxBody = {
      listingId: Number(id),
      contract: instance,
      type: type,
      args: { ...baseSetterArgs, _optionId: optionId },
    };

    return output;
  };

  const onUnregisterCnfrm = (id: number) => {
    dispatch(fetching());
    const body = createTxBodyBaseOnType(id, EventType.UNREGISTER);
    dispatch(proceedTransaction(body));
  };

  const onClaimRewardCnfrm = (id: number) => {
    dispatch(fetching());
    const body = createTxBodyBaseOnType(id, EventType.CLAIM);
    dispatch(proceedTransaction(body));
  };

  useEffect(() => {
    /**
     * Initial entity fetching
     */
    if (!id || !provider) return;
    dispatch(fetchingEntity());
    dispatch(
      getEntity({
        id: Number(id),
        provider,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    /**
     * Fetching entity after a successful tx to calculate reward
     */
    if (success && provider) {
      dispatch(fetchingEntity());
      dispatch(
        getEntity({
          id: Number(id),
          provider,
        })
      );
      dispatch(softReset()); //reset fetchEntitySuccess state
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success]);

  useEffect(() => {
    /**
     * Fetching options's stakes after successfully fetching entity
     */
    if (fetchEntitySuccess && listing && signerAddress && provider) {
      dispatch(fetchingEntity());
      dispatch(getOptionsWithStakes({ listing, stakeholder: signerAddress, provider }));
      dispatch(hardReset()); //reset transactions state
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchEntitySuccess]);

  useEffect(() => {
    /**
     * Close toggle of option after get options with stake successfully
     */
    if (updateEntitySuccess) {
      setDetails([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateEntitySuccess]);

  useEffect(() => {
    /**
     * Get options with stakes when connect wallet/signerAddress changes
     */
    if (listing && signerAddress && provider) {
      dispatch(fetchingEntity());
      dispatch(getOptionsWithStakes({ listing, stakeholder: signerAddress, provider }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, signerAddress]);

  const initialValues: IRegister = {
    registerAmount: 0,
  };

  useEffect(() => {
    /**
     * Close Modal when submitted successfully
     */
    if (submitted) {
      setModalVisibility(initialModalState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  useEffect(() => {
    /**
     * Make sure to refetch if option complete info got overriden in some unknown cases
     */
    const listingHasCompleteOptionsInfo = listing?.listingPotentials[0]?.reward; // reward is taken from smartcontract
    if (Boolean(listingHasCompleteOptionsInfo) || !provider || !listing || !signerAddress) return;
    const refetchTimer = window.setTimeout(() => {
      dispatch(fetchingEntity());
      dispatch(getOptionsWithStakes({ listing, stakeholder: signerAddress, provider }));
    }, 1500);
    return () => window.clearTimeout(refetchTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, signerAddress, id, listing]);

  const createInitialValues = (item: IOption): IRegister => {
    if (!item.stake?.amount) return initialValues;
    return { ...initialValues, registerAmount: Number(convertBnToDecimal(item.stake.amount)) };
  };

  const [amountToReturn, setAmountToReturn] = useState<BigNumber | undefined>(undefined);

  const proceedCalculation = async (optionId: number) => {
    if (!listing || !signer || !signerAddress || !listing.listingPotentials) return BigNumber.from(0);
    const instance = LISTING_INSTANCE({ address: listing.address, signer });
    if (!instance) return BigNumber.from(0);
    const optionInfo = listing.listingPotentials.find(({ id }) => id === optionId);

    const currentUnix = moment().unix();

    const value: ICalSHReward = {
      instance: instance,
      optionInfo: optionInfo!,
      stakeholder: signerAddress,
      currentUnix: BigNumber.from(currentUnix),
      storedListing: listing,
    };

    return await calculateStakeHolderReward(value);
  };

  const onRefreshAmountToReturn = (optionId: number) => (): void => {
    proceedCalculation(optionId).then((res) => setAmountToReturn(res));
  };

  const [isEditingRegister, setIsEditingRegister] = useState<boolean>(false);
  const [initialRegisterAmount, setInitialRegisterAmount] = useState<number | undefined>(undefined);
  const [chosenOptionId, setChosenOptionId] = useState<number | undefined>(undefined);

  const onEditingRegister = (registerAmount: number) => () => {
    setIsEditingRegister(true);
    setInitialRegisterAmount(registerAmount);
  };

  const onCancelEditingRegister = (setFieldValue: (field: string, value: any) => void) => () => {
    setIsEditingRegister(false);
    setFieldValue(`registerAmount`, initialRegisterAmount);
  };

  const onClaimReward = (optionId: number, stakeAmount: BigNumber) => () => {
    if (tokenBalance!.lt(stakeAmount))
      return ToastInfo(t('anftDapp.registerComponent.insufficientBalanceToClaimReward'));
    handleModalVisibility(ModalType.REWARD_CLAIM, true);
    setChosenOptionId(optionId);
  };

  const onUnregister = (optionId: number) => () => {
    handleModalVisibility(ModalType.REWARD_UNREGISTER, true);
    setChosenOptionId(optionId);
  };

  const checkTokenBalanceGteRegisterAmount =
    (submitForm: (() => Promise<void>) & (() => Promise<any>), stakeAmount: BigNumber) => () => {
      if (!tokenBalance) return;
      if (tokenBalance.lt(stakeAmount))
        return ToastInfo(t('anftDapp.registerComponent.insufficientBalanceToClaimReward'));
      submitForm();
    };

  const isLoadingTransactionAndFetchingOptions = submitted || !updateEntitySuccess;

  return (
    <CContainer fluid={isMobile} className={isMobile ? 'mx-0 my-2' : ''}>
      <SubmissionModal />
      <CRow className={'justify-content-center'}>
        <CCol xs={12} lg={`${isMobile ? '12' : '8'}`}>
          <CRow className="mx-0">
            <CCol xs={12} className="p-0">
              <CButton className="text-primary p-0 pb-1 ">
                <CIcon name="cil-arrow-circle-left" onClick={() => history.goBack()} size="lg" />
              </CButton>
              <CLabel className="text-primary content-title ml-1">
                {t('anftDapp.listingComponent.primaryInfo.investmentActivities.registerClaimReward')}
              </CLabel>
            </CCol>

            <CCard className="mt-1 listing-img-card mb-0">
              {!entityLoading && listing ? (
                <img src={returnTheFirstImage(listing.images)} alt="listingImg" className="w-100 h-100" />
              ) : (
                // Ensuring 16:9 ratio for image and image loader
                <InfoLoader width={screenWidth} height={screenWidth / 1.77} />
              )}
              <CCardBody className="p-0 listing-card-body">
                <CCardTitle className="listing-card-title mb-0 px-3 py-2 w-100">
                  <p className="mb-2 text-white content-title">{listing?.name ? listing.name : '_'}</p>
                  <p className="mb-0 text-white detail-title-font">
                    {t('anftDapp.registerComponent.activitiesCount')}{' '}
                    <b>{listing?.listingPotentials ? listing.listingPotentials.length : 0}</b>
                  </p>
                </CCardTitle>
              </CCardBody>
            </CCard>

            {listing && signerAddress ? (
              <>
                <CDataTable
                  striped
                  noItemsView={{
                    noItems: t('anftDapp.global.noItemText'),
                  }}
                  items={listing.listingPotentials}
                  fields={registerView}
                  responsive
                  hover
                  header
                  scopedSlots={{
                    activityName: (item: IOption) => {
                      return (
                        <td
                          onClick={() => {
                            toggleDetails(item.id?.toString());
                          }}
                        >
                          <span
                            className="text-primary d-inline-block text-truncate cursor-pointer"
                            style={{ maxWidth: '100px' }}
                          >
                            {item.name ? item.name : '_'}
                          </span>
                        </td>
                      );
                    },
                    reward: (item: IOption) => {
                      return <td>{item.reward ? `${item.reward.toString()}%` : '_'}</td>;
                    },
                    registerAmount: (item: IOption) => {
                      return (
                        <td>
                          {item.stake?.amount.eq(0) ? (
                            <span className="text-danger">{t('anftDapp.registerComponent.notRegister')}</span>
                          ) : (
                            formatBNToken(item.stake?.amount, true)
                          )}
                        </td>
                      );
                    },
                    details: (item: IOption) => {
                      return (
                        <CCollapse show={details.includes(item.id?.toString())}>
                          <CCard className="mb-0">
                            <CCardBody className="px-3">
                              <CRow className="align-items-center">
                                <CCol xs={12}>
                                  {isLoadingTransactionAndFetchingOptions ? (
                                    <CRow>
                                      <CCol xs={12} className="d-flex justify-content-center">
                                        <ConfirmationLoading />
                                      </CCol>
                                    </CRow>
                                  ) : (
                                    ''
                                  )}
                                  <CFormGroup row>
                                    <CCol xs={12}>
                                      <p className="content-title text-primary font-weight-bold my-2 w-100 text-center">
                                        {item.name ? item.name : '_'}
                                      </p>
                                    </CCol>
                                  </CFormGroup>
                                  <CFormGroup row className="align-items-center">
                                    <CCol xs={5}>
                                      <CLabel className="font-weight-bold my-2">
                                        {t('anftDapp.listingComponent.primaryInfo.totalStake')}
                                      </CLabel>
                                    </CCol>
                                    <CCol xs={7}>
                                      <p className="text-primary my-2 text-right">
                                        {formatBNToken(item.totalStake, true)}
                                        <CTooltip
                                          placement="bottom"
                                          content={t('anftDapp.registerComponent.totalStakeDescription')}
                                        >
                                          <FontAwesomeIcon icon={faInfoCircle} size="sm" className="ml-2" />
                                        </CTooltip>
                                      </p>
                                    </CCol>
                                  </CFormGroup>
                                  <CFormGroup row className="align-items-center">
                                    <CCol xs={5}>
                                      <CLabel className="font-weight-bold my-2">
                                        {t('anftDapp.listingComponent.extendOwnership.tokenBalance')}
                                      </CLabel>
                                    </CCol>
                                    <CCol xs={7}>
                                      <p className="text-primary my-2 text-right">
                                        {formatBNToken(tokenBalance, true)}
                                      </p>
                                    </CCol>
                                  </CFormGroup>
                                  <Formik
                                    innerRef={formikRef}
                                    enableReinitialize
                                    initialValues={createInitialValues(item)}
                                    validationSchema={validationSchema}
                                    onSubmit={(rawValues) => {
                                      try {
                                        const value = handleRawFormValues(rawValues, item.id);
                                        dispatch(fetching());
                                        dispatch(proceedTransaction(value));
                                      } catch (error) {
                                        console.log(`Error submitting form ${error}`);
                                        ToastError(`${t('anftDapp.global.errors.errorSubmittingForm')}: ${error}`);
                                      }
                                    }}
                                  >
                                    {({
                                      values,
                                      errors,
                                      touched,
                                      handleBlur,
                                      handleSubmit,
                                      setFieldValue,
                                      submitForm,
                                      isSubmitting,
                                    }) => (
                                      <CForm className="form-horizontal" onSubmit={handleSubmit}>
                                        <CFormGroup row className="align-items-center justify-content-between">
                                          <CCol xs={5}>
                                            <p className="font-weight-bold my-2">
                                              {t('anftDapp.registerComponent.registerAmount')}
                                            </p>
                                          </CCol>
                                          <CCol xs={7} md={5}>
                                            <CInputGroup>
                                              <CInput
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                  setFieldValue(`registerAmount`, unInsertCommas(e.target.value));
                                                }}
                                                id="registerAmount"
                                                autoComplete="off"
                                                name="registerAmount"
                                                value={values.registerAmount ? insertCommas(values.registerAmount) : ''}
                                                onBlur={handleBlur}
                                                placeholder={`${t('anftDapp.registerComponent.registerAmount')}...`}
                                                className="btn-radius-50"
                                                disabled={!isEditingRegister && !item.stake?.amount.eq(0)}
                                              />
                                              {item.stake?.amount && !item.stake.amount.eq(0) && !isEditingRegister ? (
                                                <CInputGroupAppend>
                                                  <CButton
                                                    color="primary"
                                                    className="btn-radius-50"
                                                    onClick={onEditingRegister(
                                                      Number(convertBnToDecimal(item.stake.amount))
                                                    )}
                                                  >
                                                    <FontAwesomeIcon icon={faPen} />
                                                  </CButton>
                                                </CInputGroupAppend>
                                              ) : (
                                                <CInputGroupAppend>
                                                  <CButton
                                                    color="primary"
                                                    className="btn-radius-50 px-2"
                                                    onClick={() =>
                                                      setFieldValue(
                                                        `registerAmount`,
                                                        unInsertCommas(convertBnToDecimal(tokenBalance!))
                                                      )
                                                    }
                                                  >
                                                    MAX
                                                  </CButton>
                                                </CInputGroupAppend>
                                              )}
                                            </CInputGroup>
                                            {isEditingRegister || item.stake?.amount.eq(0) ? (
                                              <CInvalidFeedback
                                                className={
                                                  !!errors.registerAmount && touched.registerAmount
                                                    ? 'd-block'
                                                    : 'd-none'
                                                }
                                              >
                                                {errors.registerAmount}
                                              </CInvalidFeedback>
                                            ) : (
                                              ''
                                            )}
                                          </CCol>
                                        </CFormGroup>
                                        {item.stake?.amount ? (
                                          !item.stake.amount.eq(0) ? (
                                            <>
                                              <CFormGroup row className="align-items-center">
                                                <CCol xs={5}>
                                                  <p className="font-weight-bold my-2">
                                                    {t('anftDapp.registerComponent.rewardToken')}
                                                  </p>
                                                </CCol>
                                                <CCol xs={7}>
                                                  <p className="text-primary my-2 text-right">
                                                    {amountToReturn ? formatBNToken(amountToReturn, true, 10) : 0}
                                                    <CButton
                                                      onClick={onRefreshAmountToReturn(item.id)}
                                                      className="p-0 ml-2"
                                                    >
                                                      <FontAwesomeIcon icon={faSyncAlt} className="text-primary" />
                                                    </CButton>
                                                  </p>
                                                </CCol>
                                              </CFormGroup>
                                              {item.stake?.start && !item.stake.start.eq(0) ? (
                                                <CFormGroup row className="align-items-center">
                                                  <CCol xs={5}>
                                                    <p className="font-weight-bold my-2">
                                                      {t('anftDapp.registerComponent.stakeStart')}
                                                    </p>
                                                  </CCol>
                                                  <CCol xs={7}>
                                                    <p className="my-2 text-right">
                                                      {convertUnixToDate(item.stake?.start.toNumber())}
                                                    </p>
                                                  </CCol>
                                                </CFormGroup>
                                              ) : (
                                                ''
                                              )}
                                              {isEditingRegister ? (
                                                <CFormGroup row>
                                                  <CCol xs={12} className="d-flex justify-content-center mt-3">
                                                    <CButton
                                                      className="btn-radius-50 btn-primary mr-2"
                                                      onClick={checkTokenBalanceGteRegisterAmount(
                                                        submitForm,
                                                        item.stake.amount
                                                      )}
                                                      disabled={(isSubmitting && loading) || !updateEntitySuccess}
                                                    >
                                                      {t('anftDapp.global.modal.confirm')}
                                                    </CButton>
                                                    <CButton
                                                      className="btn-radius-50 btn-outline-danger ml-2"
                                                      variant="ghost"
                                                      onClick={onCancelEditingRegister(setFieldValue)}
                                                      disabled={(isSubmitting && loading) || !updateEntitySuccess}
                                                    >
                                                      {t('anftDapp.global.modal.cancel')}
                                                    </CButton>
                                                  </CCol>
                                                </CFormGroup>
                                              ) : (
                                                <CFormGroup row>
                                                  <CCol xs={12} className="d-flex justify-content-center mt-3">
                                                    <CButton
                                                      className="btn-radius-50 btn-success mr-2"
                                                      onClick={onClaimReward(item.id, item.stake.amount)}
                                                      disabled={(isSubmitting && loading) || !updateEntitySuccess}
                                                    >
                                                      {t('anftDapp.registerComponent.claimReward.claimReward')}
                                                    </CButton>
                                                    <CButton
                                                      className="btn-radius-50 btn-outline-danger ml-2"
                                                      variant="ghost"
                                                      onClick={onUnregister(item.id)}
                                                      disabled={(isSubmitting && loading) || !updateEntitySuccess}
                                                    >
                                                      {t('anftDapp.registerComponent.unregister.unregister')}
                                                    </CButton>
                                                  </CCol>
                                                </CFormGroup>
                                              )}
                                            </>
                                          ) : (
                                            <CFormGroup row>
                                              <CCol xs={12} className="d-flex justify-content-center mt-3">
                                                <CButton
                                                  className="btn-radius-50 btn-primary mr-2"
                                                  type="submit"
                                                  disabled={(isSubmitting && loading) || !updateEntitySuccess}
                                                >
                                                  {t('anftDapp.registerComponent.register')}
                                                </CButton>
                                              </CCol>
                                            </CFormGroup>
                                          )
                                        ) : (
                                          ''
                                        )}
                                      </CForm>
                                    )}
                                  </Formik>
                                </CCol>
                              </CRow>
                            </CCardBody>
                          </CCard>
                        </CCollapse>
                      );
                    },
                  }}
                />
                <CCol xs={12} className="px-0">
                  <i className="detail-title-font">{t('anftDapp.registerComponent.selectActivity')}</i>
                </CCol>
                <CCol xs={12} className="text-center my-2">
                  <CLink to={`/${Number(id)}/activity-logs`}>
                    <CIcon name="cil-history" /> {t('anftDapp.listingComponent.activityLogs')}
                  </CLink>
                </CCol>
              </>
            ) : (
              <CCol xs={12} className="p-0">
                <div className="alert alert-warning my-3">
                  <span>{t('anftDapp.registerComponent.pleaseConnectWallet')}</span>
                </div>
              </CCol>
            )}
          </CRow>
          <ConfirmModal
            isVisible={modalsVisibility[ModalType.REWARD_CLAIM]}
            color="success"
            title={t('anftDapp.registerComponent.claimReward.claimRewardModalTitle')}
            CustomJSX={() => {
              if (chosenOptionId === undefined || !listing?.listingPotentials) return <></>;
              return (
                <p>
                  {t('anftDapp.registerComponent.claimReward.claimRewardModalContent')}{' '}
                  <span className="text-primary">“{listing?.listingPotentials[chosenOptionId]?.name || ''}”</span>?
                </p>
              );
            }}
            onConfirm={() => onClaimRewardCnfrm(chosenOptionId || 0)}
            onAbort={() => handleModalVisibility(ModalType.REWARD_CLAIM, false)}
          />
          <ConfirmModal
            isVisible={modalsVisibility[ModalType.REWARD_UNREGISTER]}
            color="danger"
            title={t('anftDapp.registerComponent.unregister.unregisterModalTitle')}
            CustomJSX={() => {
              if (chosenOptionId === undefined || !listing?.listingPotentials) return <></>;
              return (
                <p>
                  {t('anftDapp.registerComponent.unregister.unregisterModalContentPrev')}{' '}
                  <span className="text-primary">“{listing.listingPotentials[chosenOptionId]?.name || ''}”</span>{' '}
                  {t('anftDapp.registerComponent.unregister.unregisterModalContentNext')}{' '}
                  <span className="text-primary">
                    {formatBNToken(listing.listingPotentials[chosenOptionId]?.stake?.amount, true)}
                  </span>
                  ?
                </p>
              );
            }}
            onConfirm={() => onUnregisterCnfrm(chosenOptionId || 0)}
            onAbort={() => handleModalVisibility(ModalType.REWARD_UNREGISTER, false)}
          />
        </CCol>
        <CCol xs={12} lg={`${isMobile ? '12' : '4'}`} className={isMobile ? `d-none` : 'p-0'}>
          <Listings />
        </CCol>
      </CRow>
    </CContainer>
  );
};

export default Register;
