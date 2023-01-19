angular.module('Realize.admin.commonCartridge.cartridgeExportController', [
    'Realize.common.helpers',
    'Realize.paths',
    'RealizeDirectives.formResetOn',
    'RealizeDataServices',
    'Realize.admin.commonCartridge.cartridgeDataService',
    'Realize.admin.commonCartridge.supportedVersions'
])
    .controller('CartridgeExportController', [
        '$scope',
        '$log',
        '$timeout',
        'lwcI18nFilter',
        'ProgramService',
        'RealizeHelpers',
        'PATH',
        'CommonCartridgeDataSvc',
        'SUPPORTED_CARTRIDGE_VERSIONS',
        function CartridgeExportCtrl(
            $scope,
            $log,
            $timeout,
            lwcI18nFilter,
            ProgramService,
            RealizeHelpers,
            PATH,
            CommonCartridgeDataSvc,
            SUPPORTED_CARTRIDGE_VERSIONS
        ) {
            'use strict';

            var cartridgeExportAlerts = {
                success: {
                    heading: lwcI18nFilter('commonCartridgeAdmin.cartridgeExport.successAlert.heading'),
                    body: lwcI18nFilter('commonCartridgeAdmin.cartridgeExport.successAlert.body')
                },
                genericError: {
                    heading: lwcI18nFilter('commonCartridgeAdmin.cartridgeExport.errorAlert.generic.heading'),
                    body: lwcI18nFilter('commonCartridgeAdmin.cartridgeExport.errorAlert.generic.body')
                },
                mapFileError: {
                    heading: lwcI18nFilter('commonCartridgeAdmin.cartridgeExport.errorAlert.mappingFile.heading'),
                    body: lwcI18nFilter('commonCartridgeAdmin.cartridgeExport.errorAlert.mappingFile.body')
                },
                exportInProgress: {
                    heading: lwcI18nFilter('commonCartridgeAdmin.cartridgeExport.errorAlert.exportInProgress.heading'),
                    body: lwcI18nFilter('commonCartridgeAdmin.cartridgeExport.errorAlert.exportInProgress.body')
                }
            },
            STATE_PUBLISHED = 'PUBLISHED',
            timer;

            $scope.fullProgramList = [];

            ProgramService.getAllStatePrograms()
                .then(function(response) {
                    var allPrograms = response.results || [];
                    $scope.fullProgramList = _.filter(allPrograms, function(program) {
                        return program.status === STATE_PUBLISHED;
                    });
                });

            $scope.cartridgeExportInfo = {
                includeAccessRole: false,
                includeAuthoredKeywords: false,
                includeGradeLevelMetadata: false,
                createKeywordsFromContainer: false
            };

            $scope.uiState = {
                canExportCartridge: false,
                isExportingCartridge: false,
                includeStandardsMapping: false,
                isCartridgeExported: false
            };
            //using directives to tell the form when to do things like reset,
            //  and these formState props are the triggers
            //  reason for this is b/c we need to clear file upload field
            //  and can only do that through native DOM element functions,
            //  such as resetting the form
            $scope.formState = {
                reset: false
            };

            $scope.includeStandardsChanged = function() {
                validateExportInfo();
            };

            $scope.standardsProviderChanged = function cleanProvider() {
                //don't care to escape chars for this functionality, so remove [< > & " '] chars
                //after helper cleans illegal xml chars
                $scope.cartridgeExportInfo.standardsProvider =
                    RealizeHelpers.removeIllegalXmlCharacters($scope.cartridgeExportInfo.standardsProvider)
                        .replace(/[<>&"']/g, '');
                validateExportInfo();
            };

            $scope.standardsRegionChanged = function cleanRegion() {
                $scope.cartridgeExportInfo.standardsRegion =
                    RealizeHelpers.removeIllegalXmlCharacters($scope.cartridgeExportInfo.standardsRegion)
                        .replace(/[<>&"']/g, '');
                validateExportInfo();
            };

            $scope.standardsVersionChanged = function cleanVersion() {
                $scope.cartridgeExportInfo.standardsVersion =
                    RealizeHelpers.removeIllegalXmlCharacters($scope.cartridgeExportInfo.standardsVersion)
                        .replace(/[<>&"']/g, '');
                validateExportInfo();
            };

            $scope.standardsMappingFileChanged = function fileChanged() {
                validateExportInfo();
            };

            $scope.checkMapFileValidity = function isCsvFile(fileName) {
                if (fileName) {
                    var chunks = fileName.split('.');
                    return chunks.reverse()[0].toLowerCase() === 'csv';
                }
            };

            $scope.supportedCartridgeVersions = SUPPORTED_CARTRIDGE_VERSIONS;

            $scope.setCartridgeVersion = function setCartridgeVersion(version) {
                $scope.cartridgeExportInfo.version = version;
                $scope.cartridgeExportInfo.includeGradeLevelMetadata = false;
                //show grade metadata toggle only on 1.3 cartridges
                $scope.uiState.showGradeMetadataToggle = /1\.3/.test(version.description);
                validateExportInfo();
            };

            $scope.setCartridgeVersion($scope.supportedCartridgeVersions[0]);

            $scope.setCartridgeProgram = function setCartridgeProgram(program) {
                $scope.cartridgeExportInfo.program = program;
                validateExportInfo();
            };

            $scope.programSearchText = ''; //typeahead search text
            $scope.programListTemplate = [
                PATH.TEMPLATE_CACHE,
                'admin',
                'commonCartridge',
                'cartridgeExport_programTypeaheadMatch.html'
            ].join('/');

            $scope.programSearchTxtChange = function programSearchTextChanged() {
                $scope.uiState.canExportCartridge = $scope.fullProgramList.filter(function getMatches(p) {
                    return p.name === $scope.programSearchText;
                }).length > 0;

                if (!$scope.uiState.canExportCartridge && angular.isDefined($scope.cartridgeExportInfo.program)) {
                    //clear the program if all text deleted
                    $scope.setCartridgeProgram(undefined);
                }
            };

            $scope.exportCartridge = function exportCartridge() {

                validateExportInfo();

                if ($scope.uiState.canExportCartridge) {
                    $scope.uiState.isExportingCartridge = true;

                    var cartridgeInfo = {
                        programId: $scope.cartridgeExportInfo.program.id,
                        programVersion: $scope.cartridgeExportInfo.program.version,
                        ccVersion: $scope.cartridgeExportInfo.version.description,
                        includeAccessRole: $scope.cartridgeExportInfo.includeAccessRole,
                        includeAuthoredKeywords: $scope.cartridgeExportInfo.includeAuthoredKeywords,
                        includeGradeLevelMetadata: $scope.cartridgeExportInfo.includeGradeLevelMetadata,
                        createKeywordsFromContainer: $scope.cartridgeExportInfo.createKeywordsFromContainer
                    };

                    if ($scope.uiState.includeStandardsMapping) {
                        cartridgeInfo.standardsProvider = $scope.cartridgeExportInfo.standardsProvider;
                        cartridgeInfo.standardsRegion = $scope.cartridgeExportInfo.standardsRegion;
                        cartridgeInfo.standardsVersion = $scope.cartridgeExportInfo.standardsVersion;
                        cartridgeInfo.standardsMapping = $scope.cartridgeExportInfo.standardsMapFile;
                    }

                    CommonCartridgeDataSvc.createCartridge(cartridgeInfo).then(function() {
                        $scope.uiState.isCartridgeExported = true;
                        $scope.uiState.isExportingCartridge = false;
                        $scope.$emit('commonCartridge.showAlert', {
                            autoClose: true,
                            type: 'success',
                            icon: 'ok-sign',
                            msg: [
                                '<b>',
                                cartridgeExportAlerts.success.heading,
                                '</b> ',
                                cartridgeExportAlerts.success.body
                            ].join('')
                        });
                    }).catch(function(err) {
                        var errAlert = err.status === 422 ? cartridgeExportAlerts.mapFileError :
                            err.status === 501 ? cartridgeExportAlerts.exportInProgress :
                                cartridgeExportAlerts.genericError;

                        $scope.uiState.isExportingCartridge = false;
                        $scope.$emit('commonCartridge.showAlert', {
                            autoClose: false,
                            type: 'error',
                            icon: 'exclamation-sign',
                            msg: [
                                '<b>',
                                errAlert.heading,
                                '</b> ',
                                errAlert.body
                            ].join('')
                        });
                    });
                }
            };

            $scope.resetForm = function resetForm() {
                $scope.formState.reset = true;

                $scope.uiState.includeStandardsMapping =
                    $scope.cartridgeExportInfo.program =
                    $scope.cartridgeExportInfo.includeAccessRole =
                    $scope.cartridgeExportInfo.includeAuthoredKeywords =
                    $scope.cartridgeExportInfo.includeGradeLevelMetadata =
                    $scope.cartridgeExportInfo.createKeywordsFromContainer =
                    $scope.cartridgeExportInfo.standardsProvider =
                    $scope.cartridgeExportInfo.standardsRegion =
                    $scope.cartridgeExportInfo.standardsVersion =
                    $scope.cartridgeExportInfo.standardsMapFile = undefined;

                $scope.programSearchText = '';

                //put in timeout b/c form reset directive will reset entire form
                //and we need to set the includeStandardsMapping so the radio is selected
                timer = $timeout(function() {
                    $scope.uiState.isExportingCartridge =
                        $scope.uiState.isCartridgeExported =
                        $scope.uiState.canExportCartridge =
                        $scope.uiState.includeStandardsMapping =
                        $scope.uiState.showGradeMetadataToggle =
                        $scope.formState.reset =
                        $scope.cartridgeExportInfo.includeAuthoredKeywords =
                        $scope.cartridgeExportInfo.includeGradeLevelMetadata =
                        $scope.cartridgeExportInfo.createKeywordsFromContainer =
                        $scope.cartridgeExportInfo.includeAccessRole = false;

                    validateExportInfo();
                }, 100);
            };

            function validateExportInfo() {

                var standardsFieldsValid = true,
                    standardsFields = [
                    $scope.cartridgeExportInfo.standardsProvider,
                    $scope.cartridgeExportInfo.standardsRegion,
                    $scope.cartridgeExportInfo.standardsVersion,
                    $scope.cartridgeExportInfo.standardsMapFile
                ];

                function standardFieldPopulated(field) {
                    return field && field !== '';
                }

                if ($scope.uiState.includeStandardsMapping) {
                    standardsFieldsValid = standardsFields.every(standardFieldPopulated) &&
                        $scope.checkMapFileValidity($scope.cartridgeExportInfo.standardsMapFile.name);
                }

                $scope.uiState.canExportCartridge =
                    standardsFieldsValid &&
                    angular.isDefined($scope.cartridgeExportInfo.version) &&
                    angular.isDefined($scope.cartridgeExportInfo.program);
            }

            $scope.$on('$destroy', function destroy() {
                $timeout.cancel(timer);
            });
        }
    ]);
