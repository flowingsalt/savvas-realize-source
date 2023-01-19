angular.module('Realize.admin.commonCartridge.manageKeysController', [
    'ModalServices',
    'RealizeDataServices',
    'Realize.common.keyboardSupport.keyCodes',
    'Realize.admin.commonCartridge.editKeysetDirective',
    'Realize.admin.commonCartridge.keysetService'
])
    .controller('AdminCommonCartridgeManageKeysController', [
        '$scope',
        'Modal',
        'KEY_CODES',
        'ProgramService',
        'lwcI18nFilter',
        'keysetService',
        function ManageKeysCtrl(
           $scope,
           Modal,
           KEY_CODES,
           ProgramService,
           lwcI18nFilter,
           keysetService
        ) {
            'use strict';

            function findKeysetByConsumerKey(consumerKey) {
                return ($scope.keysetSearch.results || []).filter(function getByConsumerKey(ks) {
                    return ks.consumerKey === consumerKey;
                });
            }

            function populateProgramsOnKeyset(keyset) {
                keyset.programs = $scope.fullProgramList.filter(function getMatches(prog) {
                    return keyset.products.indexOf(prog.id) !== -1 && prog.status === 'PUBLISHED';
                });
                if (keyset.programs.length === keyset.products.length) {
                    return keyset;
                }
                var moderatingPrograms = $scope.fullProgramList.filter(function getMatches(prog) {
                    return keyset.products.indexOf(prog.id) !== -1 && prog.status === 'SUBMITTED';
                });
                moderatingPrograms.forEach(function(prog) {
                    keyset.programs.push(prog);
                });
                return keyset;
            }

            $scope.uiState = {
                canSearch: false,
                hasSearchResults: false,
                isSearchFocused: false,
                isSearching: false,
                hasLoadedPrograms: false
            };

            ProgramService.getAllStatePrograms()
                .then(function gotPrograms(response) {
                    $scope.fullProgramList = response.results;
                    $scope.uiState.programsLoaded = true;
                });

            /*SEARCH KEYSETS*/
            $scope.keysetSearch = {
                searchText: '',
                resultsSearchText: '',
                results: null
            };

            $scope.setSearchFocused = function setSearchFocused(isFocused) {
                $scope.uiState.isSearchFocused = !!isFocused;
            };

            $scope.searchTextChange = function searchTextChange(event) {
                $scope.uiState.canSearch = $scope.keysetSearch.searchText.length > 0;
                if (angular.isDefined(event)) {
                    if (event.which === KEY_CODES.ENTER && $scope.uiState.canSearch) {
                        $scope.search();
                    }
                }
            };

            $scope.$watch('keysetSearch.searchText', function() {
                $scope.searchTextChange();
            });

            $scope.search = function searchForKeysets() {
                $scope.uiState.isSearching = true;

                keysetService.search($scope.keysetSearch.searchText)
                    .then(function gotKeysets(response) {
                        $scope.uiState.hasSearchResults = true;
                        $scope.keysetSearch.resultsSearchText = $scope.keysetSearch.searchText;
                        $scope.keysetSearch.searchText = '';
                        $scope.keysetSearch.results = response.data.map(function populatePrograms(keyset) {
                            return populateProgramsOnKeyset(keyset);
                        });
                    })
                    .catch(function keysetSearchError() {
                        $scope.$emit('commonCartridge.showAlert', {
                            autoClose: false,
                            type: 'error',
                            icon: 'exclamation-sign',
                            msg: lwcI18nFilter('commonCartridgeAdmin.manageKeys.errorSearchingKeys')
                        });
                    })
                    .finally(function always() {
                        $scope.uiState.isSearching = $scope.uiState.canSearch = $scope.uiState.isSearchFocused = false;
                    });
            };

            /*EDIT KEYSET*/
            $scope.editKeyset = function editKeyset(keyset) {
                $scope.keysetToEdit = keyset;
            };

            $scope.onKeysetUpdate = function onKeysetUpdate(updatedKeyset) {
                if (updatedKeyset.isDeleted === true) {
                    removeKeysetFromList(updatedKeyset);
                } else {
                    var keysetByKey = findKeysetByConsumerKey(updatedKeyset.consumerKey);
                    if (keysetByKey.length > 0) {
                        keysetByKey = keysetByKey[0];
                        keysetByKey.products = updatedKeyset.products;
                        populateProgramsOnKeyset(keysetByKey);
                    }
                }

                $scope.$emit('commonCartridge.showAlert', {
                    autoClose: true,
                    type: 'success',
                    icon: 'ok-sign',
                    msg: [
                        '<b>',
                        lwcI18nFilter('commonCartridgeAdmin.manageKeys.editKeyset.success'),
                        '</b> ',
                        lwcI18nFilter('commonCartridgeAdmin.manageKeys.editKeyset.saveSuccessMsg')
                    ].join('')
                });
            };

            /*DELETE KEYSET*/
            $scope.deleteKeyset = function initializeKeysetDelete(keyset) {
                var modalButtons = {};

                modalButtons[Modal.BUTTONS.OK] = {
                    title: lwcI18nFilter('commonCartridgeAdmin.manageKeys.confirmDelete.buttons.remove'),
                    handler: function deleteKeysetConfirmed() {
                        keyset.isBeingDeleted = true;
                        deleteKeyset(keyset);
                    }
                };
                modalButtons[Modal.BUTTONS.CANCEL] = {
                    title: lwcI18nFilter('commonCartridgeAdmin.manageKeys.confirmDelete.buttons.cancel'),
                    handler: angular.noop
                };

                Modal.simpleDialog(
                    lwcI18nFilter('commonCartridgeAdmin.manageKeys.confirmDelete.heading'),
                    lwcI18nFilter('commonCartridgeAdmin.manageKeys.confirmDelete.body'),
                    modalButtons
                );
            };

            function deleteKeyset(keyset) {
                keyset.isBeingDeleted = true;
                keysetService.deleteKeyset(keyset.consumerKey)
                    .then(function deletedKeyset() {
                        removeKeysetFromList(keyset);
                    })
                    .catch(function noDeleteKeyset() {
                        $scope.$emit('commonCartridge.showAlert', {
                            autoClose: false,
                            type: 'error',
                            icon: 'exclamation-sign',
                            msg: lwcI18nFilter('commonCartridgeAdmin.manageKeys.errorSearchingKeys')
                        });
                    });
            }

            function removeKeysetFromList(keyset) {
                var keysetByKey = findKeysetByConsumerKey(keyset.consumerKey);

                if (keysetByKey.length > 0) {
                    var idx = $scope.keysetSearch.results.indexOf(keysetByKey[0]);
                    $scope.keysetSearch.results.splice(idx, 1);

                    if ($scope.keysetSearch.results.length === 0) {
                        $scope.uiState.hasSearchResults = false;
                    }
                }
            }
        }
    ]);
