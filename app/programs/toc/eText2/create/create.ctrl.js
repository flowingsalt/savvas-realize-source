angular.module('Realize.eText2Builder.eText2CreateCtrl', [
    'rlzComponents.components.i18n',
    'Realize.navigationService',
    'Realize.eText2Builder.eText2BuilderService'
])
    .controller('EText2CreateCtrl', [
        '$scope',
        '$log',
        '$location',
        'NavigationService',
        'EText2BuilderService',
        'eText2Data',
        function($scope, $log, $location, NavigationService, EText2BuilderService, eText2Data) {
            'use strict';

            this.etexts = eText2Data;
            this.eText2Selection = {}; // ng-model object

            this.next = function() {
                this.serverError = false;

                if (!this.createEText2SelectionForm.$invalid) {
                    this.isInProgress = true;

                    var params = {
                        title: this.eText2Selection.title,
                        text: this.eText2Selection.instructions || '',
                        fileType : 'Sequence',
                        mediaType : 'Selected Reading',
                        isbn: this.getETextIsbn(),
                        programs: $scope.currentProgram.programs
                    };

                    EText2BuilderService.createEText2Selection($scope.currentProgram.id, params)
                        .then(function() {
                            this.isInProgress = false;
                            // route change logic will come here
                        }.bind(this), function(error) {
                            this.serverError = true;
                            this.isInProgress = false;
                            $log.error('Failed to create reading selection.', error);
                        }.bind(this));
                }

            };

            this.back = function() {
                var fallback = $location.path().split('/eText2/')[0];
                NavigationService.back(fallback);
            };

            this.cancel = function() {
                this.back();
            };

            this.getETextIsbn = function() {
                var selectedEText, fileLocation, selectedETextIsbn;
                selectedEText = this.eText2Selection.etext;
                fileLocation = selectedEText.fileLocation;

                selectedETextIsbn = (fileLocation.indexOf('/books/') > -1) ?
                                    fileLocation.substring(fileLocation.indexOf('/books/')).split('/')[2] : '';

                return selectedETextIsbn;
            };

            this.isOneETextAvailable = function() {
                if (this.etexts.length === 1) {
                    this.eText2Selection.etext = this.etexts[0];
                    this.createEText2SelectionForm.$setDirty();

                    return true;
                }

                return false;
            };

            this.isNextDisabled = function() {
                return (this.createEText2SelectionForm.$invalid ||
                        this.isInProgress);
            };

            this.isETextTitleEmpty = function() {
                return (this.createEText2SelectionForm.title.$invalid &&
                        this.createEText2SelectionForm.title.$dirty);
            };

            this.selectETextItem = function(eTextItem) {
                this.eText2Selection.etext = eTextItem;
            };
        }

    ]);
