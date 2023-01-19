angular.module('Realize.admin.commonCartridge.editKeysetDirective', [
    'ModalServices',
    'RealizeDataServices',
    'Realize.admin.commonCartridge.keysetService'
])
    .directive('editKeysetModal', [
        'Modal',
        'lwcI18nFilter',
        'keysetService',
        function editKeysetModal(Modal, lwcI18nFilter, keysetService) {
            'use strict';

            return {
                restrict: 'EA',
                scope: {
                    keysetToEdit: '=',
                    onUpdate: '&'
                },
                link: function link(scope) {
                    var isModalOpened = false,
                        modalScope = null,
                        getOrgProgramsPromise;

                    function modalClosed() {
                        isModalOpened = false;
                        scope.keysetToEdit = undefined;
                        modalScope.$destroy();
                    }

                    function getSelectedItems() {
                        return modalScope.fullProgramList.filter(function getSelected(p) {
                            return p.selected === true;
                        });
                    }

                    function getSelectedItemsIds() {
                        return getSelectedItems().map(function getIds(p) {
                            return p.id;
                        });
                    }

                    function typeAndSelectHandler() {
                        var selectedItems = getSelectedItemsIds();

                        if (selectedItems.length === 0) {
                            modalScope.uiState.isDeleteEquivalent = modalScope.uiState.canUpdateKeyset =
                                true;
                            return;
                        }

                        modalScope.uiState.isDeleteEquivalent = false;

                        var hasRemovedSome = modalScope.keyset.products.some(function notInSelected(pid) {
                            return selectedItems.indexOf(pid) === -1;
                        });

                        var hasAddedSome = selectedItems.some(function notInOriginal(pid) {
                            return modalScope.keyset.products.indexOf(pid) === -1;
                        });

                        modalScope.uiState.canUpdateKeyset = hasRemovedSome || hasAddedSome;
                    }

                    function propagateUpdate() {
                        if (angular.isFunction(scope.onUpdate)) {
                            scope.onUpdate()(modalScope.keyset);
                        }
                        modalScope.close();
                    }

                    function errorUpdating() {
                        modalScope.uiState.hasPopupAlert = true;
                        modalScope.uiState.isUpdatingKeyset = false;
                        modalScope.popupAlertDetails = {
                            type: 'danger',
                            icon: 'exclamation-sign',
                            msg: lwcI18nFilter(
                                'commonCartridgeAdmin.manageKeys.editKeyset.errorUpdating')
                        };
                    }

                    function openModal() {

                        isModalOpened = true;

                        modalScope = scope.$new(true);
                        modalScope.uiState = {
                            canUpdateKeyset: false,
                            hasPopupAlert: false,
                            isDeleteEquivalent: false,
                            isUpdatingKeyset: false
                        };
                        //copy in case changes are made but modal is cancelled instead of save clicked
                        modalScope.keyset = angular.copy(scope.keysetToEdit);

                        modalScope.typeAndSelectConfig = {
                            results: modalScope.fullProgramList,
                            preSelectedItems: modalScope.preSelectedItems,
                            formText: {
                                mainLabel: lwcI18nFilter(
                                    'commonCartridgeAdmin.manageKeys.editKeyset.programsSelect.mainLabel'
                                ),
                                help: lwcI18nFilter(
                                    'commonCartridgeAdmin.manageKeys.editKeyset.programsSelect.help'
                                ),
                                noMatch: lwcI18nFilter(
                                    'commonCartridgeAdmin.manageKeys.editKeyset.programsSelect.alert.noMatch'
                                ),
                                submitError: lwcI18nFilter(
                                    'commonCartridgeAdmin.manageKeys.editKeyset.programsSelect.alert.submitError'
                                ),
                                addAllLabel: lwcI18nFilter(
                                    'commonCartridgeAdmin.manageKeys.editKeyset.programsSelect.addAllLabel'
                                ),
                                offScreenRemove: lwcI18nFilter(
                                    'commonCartridgeAdmin.manageKeys.editKeyset.programsSelect.offScreenRemove.a11y'
                                ),
                                placeholder: lwcI18nFilter(
                                    'commonCartridgeAdmin.manageKeys.editKeyset.programsSelect.placeholder'
                                )
                            },
                            isAddAllEnabled: false,
                            isFormSubmitted: function() {
                                return false;
                            },
                            customFilter: function($viewValue) {
                                return {
                                    title: $viewValue
                                };
                            },
                            popoverPlacement: 'left',
                            popupMatchTmplUrl: 'templates/admin/commonCartridge/createKeys_programTypeaheadMatch.html',
                            searchBufferMS: 300,
                            selectedItemTmplUrl:
                                'templates/admin/commonCartridge/createKeys_programTypeaheadSelectedItem.html'
                        };

                        modalScope.$on('typeAndSelect.itemAdded', typeAndSelectHandler);

                        modalScope.$on('typeAndSelect.itemRemoved', typeAndSelectHandler);

                        modalScope.save = function saveKeyset(evt) {
                            evt.preventDefault();
                            modalScope.uiState.isUpdatingKeyset = true;

                            if (modalScope.uiState.isDeleteEquivalent) {
                                keysetService.deleteKeyset(modalScope.keyset.consumerKey)
                                    .then(function deleted() {
                                        modalScope.keyset.isDeleted = true;
                                        propagateUpdate();
                                    })
                                    .catch(errorUpdating);
                            } else {
                                modalScope.keyset.products = getSelectedItemsIds();
                                delete modalScope.keyset.programs;
                                keysetService.updateKeyset(modalScope.keyset)
                                    .then(function updated() {
                                        propagateUpdate();
                                    })
                                    .catch(errorUpdating);
                            }
                        };

                        modalScope.close = function closeModal() {
                            Modal.hideDialog()
                                .finally(modalClosed);
                        };

                        getOrgProgramsPromise.then(function gotPrograms(response) {
                            modalScope.fullProgramList = modalScope.typeAndSelectConfig
                                .results = angular.copy(response);

                            modalScope.preSelectedItems = modalScope.typeAndSelectConfig
                                .preSelectedItems = modalScope.fullProgramList
                                .filter(function getPreSelects(program) {
                                    return modalScope.keyset.products.indexOf(
                                            program.id) !== -1;
                                });

                            Modal.showDialog(
                                'templates/admin/commonCartridge/editKeysetModal/editKeysetModal.html',
                                modalScope);

                            if (modalScope.preSelectedItems.length > 0) {
                                modalScope.$broadcast(
                                    'typeAndSelect.selectPrePopulatedItems',
                                    modalScope.preSelectedItems);
                            }
                        });
                    }

                    scope.$watch('keysetToEdit', function() {
                        if (angular.isDefined(scope.keysetToEdit) && !isModalOpened) {
                            getOrgProgramsPromise = keysetService.getProgramsForOrg(scope.keysetToEdit.orgId);
                            openModal();
                        }
                    });
                }
            };
        }
    ]);
