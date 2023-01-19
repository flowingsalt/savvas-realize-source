angular.module('Realize.ui.modal.UnsavedChangesModal', [
    'ModalServices'
])
.factory('UnsavedChangesModal', [
    '$rootScope',
    'Modal',
    '$log',
    '$location',
    '$q',
    function($rootScope, Modal, $log, $location, $q) {
        'use strict';

        function UnsavedChangesModal(save) {
            if (!save) {
                throw 'UnsavedChangesModal: Must define save function.';
            }

            var isDismissed,
                deferred,
                dismissModal,
                proceedWithCurrentAction,
                reset,
                scope,
                nextLocation;

            isDismissed = false;

            deferred = $q.defer();

            dismissModal = function() {
                isDismissed = true;
                return Modal.hideDialog();
            };

            proceedWithCurrentAction = function() {
                deferred.resolve();

                if ($location.url() !== nextLocation) {
                    $location.url(nextLocation);
                }
            };

            reset = function() {
                isDismissed = false;
                deferred = $q.defer();
            };

            scope = $rootScope.$new();

            scope.delegate = {
                close: function() {
                    Modal.hideDialog();
                    deferred.reject();
                    reset();
                },
                discard: function() {
                    dismissModal().then(proceedWithCurrentAction);
                },
                save: function() {
                    dismissModal().then(function() {
                        var saveCompleted = $q.when(save());
                        //if save is not successful, then reset modal so that it can be retriggered
                        saveCompleted.then(proceedWithCurrentAction, reset);
                    });
                }
            };

            this.showDialog = function(event) {
                if (!isDismissed) {
                    nextLocation = $location.url(); //store upcoming location before preventDefault
                    if (event) {
                        event.preventDefault();
                    }
                    Modal.showDialog('templates/partials/unsaved_edit_dialog.html', scope);
                }

                return deferred.promise;
            };

            this.reset = function() {
                reset();
            };
        }

        return UnsavedChangesModal;
    }
]);
