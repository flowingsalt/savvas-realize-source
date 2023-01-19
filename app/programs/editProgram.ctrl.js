angular.module('RealizeApp')
    .controller('EditProgramCtrl', [
        '$scope',
        '$location',
        'Content',
        'ProgramContent',
        'MyContent',
        'Modal',
        'AlertService',
        'lwcI18nFilter',
        '$q',
        'TEMPLATE_PATH',
        'UnsavedChangesModal',
        function($scope, $location, Content, ProgramContent, MyContent, Modal, AlertService, lwcI18nFilter, $q,
                 templatePath, UnsavedChangesModal) {
            'use strict';

            var openProgramView = function(itemId, itemVersion) {
                var path = $location.path(),
                    next = path.split('/program')[0] + '/program/' + itemId + '/' + itemVersion;
                $location.path(next);
            };

            var deleteVersionExternalReference = function(item) {
                delete item.version;
                delete item.externalReference;
                delete item.externalId;
                delete item.externalSource;
            };

            var setProgramOriginalIdAndId = function() {
                var deferred = $q.defer();

                //case: original program
                if (!$scope.isCustomized) {

                    if (ProgramContent.customizedItem) {
                        //re-use previously created customized item
                        $scope.programForSubmit.id = ProgramContent.customizedItem.id;
                    } else {
                        //allows new item id to be created
                        delete $scope.programForSubmit.id;
                    }

                    $scope.programForSubmit.originalItemId = ProgramContent.id;
                    deleteVersionExternalReference($scope.programForSubmit);
                    deferred.resolve();

                    //case: customized program
                } else {
                    MyContent.getOriginalIdFromCustomized(ProgramContent.id)
                        .then(function(data) { //Success
                            $scope.programForSubmit.originalItemId = data.originalItemId;
                            deferred.resolve();
                        },
                        function() { //Failure
                            deferred.reject();
                        });
                }

                return deferred.promise;
            };

            var getContentItemForSubmit = function(item) {
                return {
                    id: item.id,
                    associativeProps: item.associativeProps
                };
            };

            var updateContentItems = function(contentItems) {
                var updatedProgramContentItems = [];

                $.each(contentItems, function(index, childItem) {
                    //case: child item was hidden
                    if ($scope.hiddenItem[childItem.id]) {
                        childItem.associativeProps.externalSource = 'Teacher, HideFromStudent';
                    } else if (angular.isDefined($scope.hiddenItem[childItem.id]) && !$scope.hiddenItem[childItem.id]) {

                        //case: item was hidden in backend
                        if (childItem.associativeProps.externalSource &&
                            childItem.associativeProps.externalSource === 'Teacher, HideFromStudent') {
                            delete childItem.associativeProps.externalSource;
                            $scope.undoIsOn[childItem.id] = false;
                        }
                    }

                    var childItemForSubmit = getContentItemForSubmit(childItem);
                    updatedProgramContentItems.push(childItemForSubmit);
                });

                return updatedProgramContentItems;
            };

            var createDetailedItem = function() {
                return {
                    isDefaultView: true,
                    originalItemId: $scope.programForSubmit.originalItemId,
                    json: JSON.stringify($scope.programForSubmit)
                };
            };

            var deleteAttachments = function(item) {
                delete item.attachments;
            };

            var setAssociatedItems = function(parentItem) {
                var associatedItems = [
                    'associatedTeacherSupport', 'associatedTools', 'associatedRemediation', 'customizedItem'];
                $.each(associatedItems, function(index, associatedItem) {
                    if (parentItem[associatedItem]) {
                        /**
                         * overwrite existing associatedItem object to only retain its id
                         * to reduce REST request size
                         */
                        parentItem[associatedItem] = getContentItemForSubmit(parentItem[associatedItem]);
                    }
                });
            };

            var updateTocModel = function() {
                // Set toc's id and original id
                var setProgramIdsPromise = setProgramOriginalIdAndId();

                if (ProgramContent.contentItems && ProgramContent.contentItems.length > 0) {
                    $scope.programForSubmit.contentItems = updateContentItems($scope.contentItemsListForEdit);
                }

                // Retain only item id for associated items to reduce request size
                setAssociatedItems($scope.programForSubmit);
                deleteAttachments($scope.programForSubmit);

                $scope.programForSubmit.defaultView = true;

                // Create detailed item object for upsert request
                var deferredDetailedItem = $q.defer();

                setProgramIdsPromise.then(function() {
                    deferredDetailedItem.resolve(createDetailedItem());
                }, function() {
                    deferredDetailedItem.reject();
                });

                return deferredDetailedItem.promise;
            };

            var setAlert = function() {
                var successEditAlertMsg = [
                    '<strong>',
                    lwcI18nFilter('editProgram.successNotification.programUpdated.title'),
                    '</strong>',
                    lwcI18nFilter('editProgram.successNotification.programUpdated.message')
                ].join(' ');

                AlertService.addAlert('success', 'ok-sign', successEditAlertMsg, 2);
            };

            $scope.programForSubmit = angular.copy(ProgramContent);

            //List rendered by program edit view
            $scope.contentItemsListForEdit = angular.copy(ProgramContent.contentItems);
            $scope.isCustomized = ProgramContent.inMyLibrary;
            var isUnsavedChangesModalDismissed = false,
                isSaveRequestFromModal = false;

            $scope.hasHidden = function(item) {
                if (angular.isDefined($scope.undoIsOn[item.id])) {
                    return $scope.undoIsOn[item.id];
                } else {
                    return (item.associativeProps &&
                        item.associativeProps.externalSource === 'Teacher, HideFromStudent');
                }
            };

            $scope.navigationFallback = function() {
                openProgramView(ProgramContent.id, ProgramContent.version);
            };

            $scope.cancel = function() {
                isUnsavedChangesModalDismissed = true;
                openProgramView(ProgramContent.id, ProgramContent.version);
            };

            /*Removes customized TOC from user's view by setting defaultView to false*/
            $scope.removeCustomized = function(e) {
                isUnsavedChangesModalDismissed = true;
                e.preventDefault();
                e.stopPropagation();

                var closeModal = function() {
                    Modal.hideDialog();
                };

                var updateDefaultView = function() {
                    var isDefaultView = false;
                    if ($scope.isCustomized) {

                        //Reverts hidden items to original state (visible)
                        $.each(ProgramContent.contentItems, function(index, item) {
                            if (item.associativeProps &&
                                item.associativeProps.externalSource === 'Teacher, HideFromStudent') {
                                delete item.associativeProps.externalSource;
                            }
                        });

                        MyContent.makeDefaultView(ProgramContent.id, isDefaultView).then(function(result) {
                            Modal.hideDialog();
                            openProgramView(result.originalItemId, 0);
                        });
                    }
                };

                var confirm = function() {
                    updateDefaultView();
                };

                var modalScope = $scope.$new();
                modalScope.dialogId = 'removeCustomizedWarningModal';
                modalScope.title = lwcI18nFilter('editProgram.removeCustomizedTOC.title');
                modalScope.body = lwcI18nFilter('editProgram.removeCustomizedTOC.message');
                modalScope.isDismissible = false;
                modalScope.buttons = [
                    {title: lwcI18nFilter('editProgram.action.cancel'), clickHandler: closeModal},
                    {title: lwcI18nFilter('global.action.button.ok'), clickHandler: confirm, isDefault: true}
                ];
                modalScope.closeBtnClickHandler = function() {
                    Modal.hideDialog();
                };

                modalScope.dismissed = false;

                Modal.showDialog('templates/partials/simpleDialog.html', modalScope);
            };

            // Saves customized toc
            $scope.save = function() {
                isUnsavedChangesModalDismissed = true;

                // show progress bar
                var progressModal = Modal.progressDialog($scope.$new(), {
                    progressHeader: lwcI18nFilter('editProgram.updateProgress.title'),
                    progressMessage: lwcI18nFilter('editProgram.updateProgress.message')
                }).then(function() {
                    progressModal.fakeProgress();
                });

                var detailedItemPromise = updateTocModel();

                var addToLibrary = function(detailedItem) {
                    return MyContent.addContentItemToMyLibrary(detailedItem, detailedItem.originalItemId);
                };

                var completeProgress = function(addToLibResponse) {
                    var progressCompleted = $q.defer(),
                        item = angular.isArray(addToLibResponse.item) ?
                            addToLibResponse.item[0] : addToLibResponse.item;

                    progressModal.then(function() {
                        progressModal.progressComplete().then(function() {
                            Modal.hideDialog();
                            progressCompleted.resolve(item);
                        });
                    });

                    return progressCompleted.promise;
                };

                var switchView = function(addedItem) {
                    setAlert();
                    // removing the id so that it will reload after customization/reorder.
                    delete ProgramContent.id;
                    if (!isSaveRequestFromModal) {
                        openProgramView(addedItem.id, addedItem.version);
                    }
                };

                var onFailure = function() {
                    progressModal.close();
                    $scope.serverError = true;
                };

                return detailedItemPromise
                    .then(addToLibrary, onFailure)
                    .then(completeProgress, onFailure)
                    .then(switchView);
            };

            $scope.hiddenItem = {};
            $scope.undoIsOn = {};
            $scope.unhiddenItem = {};

            $scope.hideItem = function(itemId) {
                $scope.hiddenItem[itemId] = true;
                $scope.undoIsOn[itemId] = true;
            };

            $scope.unhideItem = function(itemId) {
                $scope.hiddenItem[itemId] = false;
                $scope.undoIsOn[itemId] = false;
            };

            //uhide/unhide wrapped into one function for "h/H" key
            $scope.toggleHideUnHide = function(itemIndex) {
                var item = $scope.contentItemsListForEdit[itemIndex];
                var itemId = item.id;

                if ($scope.hiddenItem[itemId] && $scope.undoIsOn[itemId]) {
                    $scope.hiddenItem[itemId] = $scope.undoIsOn[itemId] = false;
                } else {
                    $scope.hiddenItem[itemId] = $scope.undoIsOn[itemId] = true;
                }
            };

            $scope.dragDropOpts = {
                keyCode: 72,
                keyAction: $scope.toggleHideUnHide,
                placeholder: 'item sortable sortable-placeholder',
                thumbnailModeFix: true,
                opacity:0.6
            };

            $scope.showKeyboardInstDialog = function(e) {
                e.preventDefault();
                e.stopPropagation();

                var closeModal = function() {
                    Modal.hideDialog();
                };

                var modalScope = $scope.$new();
                modalScope.dialogId = 'programReorderKeyboardInstDialog';
                modalScope.title = lwcI18nFilter('global.accessibility.reorder.title');
                modalScope.body = lwcI18nFilter('global.accessibility.reorder.message.toc');
                modalScope.isDismissible = false;
                modalScope.closeBtnClickHandler = function() {
                    closeModal();
                };
                modalScope.buttons = [
                    {title: lwcI18nFilter('global.action.button.ok'), clickHandler: closeModal, isDefault: true}
                ];
                modalScope.dismissed = false;

                Modal.showDialog('templates/partials/simpleDialog.html', modalScope);
            };

            var unsavedChangesModal = new UnsavedChangesModal(function() {
                isSaveRequestFromModal = true;
                return $scope.save();
            });

            $scope.$on('$locationChangeStart', function(event) {
                var currentListForEdit = angular.copy($scope.contentItemsListForEdit);
                updateContentItems(currentListForEdit);

                if (!angular.equals(ProgramContent.contentItems, currentListForEdit) &&
                    !isUnsavedChangesModalDismissed) {
                    unsavedChangesModal.showDialog(event);
                }
            });
        }
    ]);
