angular.module('RealizeApp')
    .controller('EditLessonCtrl', [
        '$scope',
        '$rootScope',
        '$routeParams',
        'Content',
        'MyContent',
        '$log',
        '$location',
        'Modal',
        'EditLessonContent',
        'lwcI18nFilter',
        'UnsavedChangesModal',
        'AlertService',
        'InlineAlertService',
        '$q',
        'ContentSource',
        'CONTENT_UPLOAD_TYPES',
        'locationUtilService',
        'penpalService',
        '$timeout',
        function($scope, $rootScope, $routeParams, Content, MyContent, $log, $location, Modal, EditLessonContent,
            lwcI18nFilter, UnsavedChangesModal, AlertService, InlineAlertService, $q, ContentSource,
            CONTENT_UPLOAD_TYPES, locationUtilService, penpalService, $timeout) {

            'use strict';

            var proceededWithSave = false,
                newUploadPosition;

            $scope.lesson = EditLessonContent;
            $scope.isSaveInProgress = false;
            $scope.subPage = CONTENT_UPLOAD_TYPES.EDIT_LESSON;

            /**
             * Builds a flat list that represents the given contentItems tree.
             * "Flat" means all descendants in the hierarchy are on the same
             * level and no item has children. This function is used to facilitate
             * reordering and inserting new items when customizing a lesson.
             *
             * @param {Object} contentItemsTree - contentItems from a lesson
             * @return {Array} flatContentItemsList - flat contentItems list made of the
             * lesson's descendants
             */
            var getFlatContentItemsList = function(contentItemsTree) {
                var flatContentItemsList = [];

                angular.forEach(contentItemsTree, function(item) {

                    //Add item to list
                    flatContentItemsList.push(item);

                    if (item.mediaType === 'Learning Model') {
                        if (item.contentItems && item.contentItems.length > 0) {

                            //Add children of Learning Model to list
                            flatContentItemsList = flatContentItemsList.concat(item.contentItems);

                            item.contentItems = [];
                        }
                    }
                });

                //$log.log("flat content items list ", flatContentItemsList);
                return flatContentItemsList;
            };

            var currentTemporaryId = 0; //for remove/undo operations

            var getContentItemsListForEdit = function(contentItems) {
                /* List rendered by lesson edit view */
                $scope.contentItemsListForEdit = getFlatContentItemsList(contentItems);

                /* Add temp ids to existing items to maintain remove/undo list */
                angular.forEach($scope.contentItemsListForEdit, function(item) {
                    item.tempId = 'tempId_' + (currentTemporaryId++);
                });
            };
            if (locationUtilService.isDeeplinkDataTabActive()) {
                $rootScope.hideFooter = true;
            }
            $scope.$on('$viewContentLoaded', function() {
                $timeout(function() {
                    if (locationUtilService.isDeeplinkDataTabActive()) {
                        var body = document.body,
                            html = document.documentElement;
                        var height = Math.max(body.scrollHeight, body.offsetHeight,
                            html.clientHeight, html.scrollHeight, html.offsetHeight);
                        var payload = { resize_height: height };
                        penpalService.connectToParent().then(function(connection) {
                            connection.parent.exec('RESIZE_PAGE', payload);
                        });
                    }
                }, 1000);
            });
            $scope.reorderModeIsOn = $location.path().indexOf('/reorder') >= 0;
            $scope.dragDropOptions = {enabled: $scope.reorderModeIsOn, opacity:0.6};
            $scope.titleMax = 50;
            $scope.isCustomized = $scope.lesson.contribSource === 'My Uploads';

            $scope.searchProvider = ContentSource.PROVIDER.REALIZE;

            var lessonId = $scope.lesson.id;
            var lessonCustomizedItem = angular.copy($scope.lesson.customizedItem);
            var saveModalDismissed;

            var openLessonView = function(lesson) {
                var path = $location.path(),
                    next;

                if ($routeParams.keywords) {
                    next = path.split('/search')[0] + '/search/lesson/' + lesson.id + '/' + lesson.version;
                } else {
                    next = path.split('/lesson')[0] + '/lesson/' + lesson.id + '/' + lesson.version;
                }

                //$log.log('GO TO UPDATED LESSON', path, next);
                $location.path(next);
            };

            var setAlert = function() {
                var successEditAlertMsg =
                        [
                            '<strong>',
                            lwcI18nFilter('editLesson.successNotification.lessonUpdated.title'),
                            '</strong>',
                            lwcI18nFilter('editLesson.successNotification.lessonUpdated.message')
                        ].join(' ');

                AlertService.addAlert('success', 'ok-sign', successEditAlertMsg, 2);
            };

            /**
             * Builds a tree from a flat list of contentItems. This function is used
             * to re-build the lesson hierarchy when saving the customized lesson.
             * The hierarchy is determined by the positions of Learning Models.
             * Items outside Learning Models are children of the lesson.
             * Learning Models are children of the lesson.
             * Items between the current and next Learning Model are children of the
             * current Learning Model.
             *
             * @param {Object} flatContentItemsList - contentItems from the lesson modified by getFlatContentItemsList()
             * @return {Object} contentItemsTree - contentItems of the lesson with hierarchy in place
             */
            var getContentItemsTree = function(flatContentItemsList) {
                var contentItemsTree = [];
                var currentLearningModel;

                angular.forEach(flatContentItemsList, function(item) {
                    var itemForSubmit;

                    //case: existing item
                    if (item.id) {

                        //case: Learning Model that is not customized
                        if (item.mediaType === 'Learning Model' && item.contribSource !== 'My Uploads') {

                            //create a new customized learning model to allow for reordering and adding new items
                            itemForSubmit = {
                                mediaType: 'Learning Model',
                                fileType: 'Sequence',
                                title: item.title
                            };

                        //case: Other items
                        } else {
                            if (item.fileType === ContentSource.PROVIDER.Open_ED) {
                                var thumbnailUrls = [];
                                if (angular.isArray(item.thumbnailUrls) && item.thumbnailUrls.length !== 0) {
                                    thumbnailUrls[0] = item.thumbnailUrls[0];
                                }

                                itemForSubmit = {
                                    externalId: item.id,
                                    externalSource: item.fileType,
                                    title: item.title,
                                    contribSource: item.fileType,
                                    fileType: 'URL',
                                    mediaType: 'Link',
                                    thumbnailUrls: thumbnailUrls
                                };
                            } else {
                                //re-use existing id
                                itemForSubmit = {
                                    id: item.id
                                };
                            }
                        }

                        itemForSubmit.associativeProps = item.associativeProps; //needs to be persisted for backend

                    //case: new item (item w/o id), send all metadata.
                    //happens for new file/link/student voice/learning model
                    } else {
                        itemForSubmit = item;
                    }

                    if (item.mediaType === 'Learning Model') {
                        contentItemsTree.push(itemForSubmit);
                        currentLearningModel = itemForSubmit;
                        currentLearningModel.contentItems = [];
                    } else {
                        if (angular.isDefined(currentLearningModel)) {
                            currentLearningModel.contentItems.push(itemForSubmit);
                        } else {
                            contentItemsTree.push(itemForSubmit);
                        }
                    }
                });

                return contentItemsTree;
            };

            var removeCachedCurrentProgram = function() {
                delete $rootScope.currentProgram;
            };

            var createDetailedItem = function() {
                return {
                    isDefaultView: true,
                    originalItemId: $scope.lesson.originalItemId,
                    json: JSON.stringify($scope.lesson)
                };
            };

            var setOriginalIdAndLessonId = function() {
                var deferredOriginalIdAndLessonId = $q.defer();

                //case: original lesson
                if (!$scope.isCustomized) {

                    if (lessonCustomizedItem) {
                        //re-use previously created customized item
                        $scope.lesson.id = lessonCustomizedItem.id;
                    } else {
                        //allows new item id to be created
                        delete $scope.lesson.id;
                    }

                    $scope.lesson.originalItemId = lessonId;
                    delete $scope.lesson.version;
                    delete $scope.lesson.externalReference;
                    delete $scope.lesson.externalId;
                    delete $scope.lesson.externalSource;

                    deferredOriginalIdAndLessonId.resolve();

                //case: customized lesson
                } else {
                    MyContent.getOriginalIdFromCustomized(lessonId)
                        .then(function(data) { //Success
                            $scope.lesson.originalItemId = data.originalItemId;
                            deferredOriginalIdAndLessonId.resolve();
                        },
                        function() { //Failure
                            deferredOriginalIdAndLessonId.reject();
                        });
                }

                return deferredOriginalIdAndLessonId.promise;
            };

            var isInvalid = function(item) {
                return (item.mediaType === 'Learning Model' && !$.trim(item.title)) ||
                        (item.mediaType === 'Student Voice' && !$.trim(item.text));
            };

            var isRemoved = function(item) {
                return item.tempId && $scope.removedItems[item.tempId];
            };

            var removeItems = function(contentItems) {
                return _.reject(contentItems, function(contentItem) {
                    return (contentItem && isRemoved(contentItem)) || isInvalid(contentItem);
                });
            };

            var setAssociatedItems = function() {
                var associatedItems = ['associatedTeacherSupport', 'associatedTools', 'associatedRemediation'];
                $.each(associatedItems, function(index, associatedItem) {
                    if ($scope.lesson[associatedItem]) {
                        /**
                         * overwrite existing associatedItem object to only retain its id
                         * to reduce REST request size
                         */
                        $scope.lesson[associatedItem] = {
                            id: $scope.lesson[associatedItem].id
                        };
                    }
                });
            };

            var updateLessonModel = function() {

                /*Set lesson's id and original id*/
                var setIdsPromise = setOriginalIdAndLessonId();

                /*Remove the marked contentItems from the lesson*/
                $scope.contentItemsListForEdit = removeItems($scope.contentItemsListForEdit);

                /*Retain only item id for associated items to reduce request size*/
                setAssociatedItems();

                $scope.lesson.defaultView = true;
                $scope.lesson.contentItems = getContentItemsTree($scope.contentItemsListForEdit);
                delete $scope.lesson.customizedItem; //a customized item should not have its own customized item

                /*Create detailed item object for upsert request*/
                var deferredDetailedItem = $q.defer();

                setIdsPromise.then(function() { //Success
                    deferredDetailedItem.resolve(createDetailedItem());
                }, function() { //Failure
                    deferredDetailedItem.reject();
                });

                return deferredDetailedItem.promise;
            };

            getContentItemsListForEdit($scope.lesson.contentItems);

            // Take snapshot of contentItemsListForEdit before modifications
            var pristineListForEdit = angular.copy($scope.contentItemsListForEdit);

            /**
             * Removes the customized lesson from the user's view by setting the
             * isDefaultView property of the lesson item to false. The customized
             * lesson is not deleted once created - for 'new' customizations, the
             * same item is reused, but it's metadata is updated and isDefaultView is
             * set to true.
             */
            $scope.removeCustomized = function(e) {
                saveModalDismissed = true;
                e.preventDefault();
                e.stopPropagation();

                var closeModal = function() {
                    Modal.hideDialog();
                };

                var updateDefaultView = function() {
                    var isDefaultView = false;
                    if ($scope.isCustomized) {
                        MyContent.makeDefaultView(lessonId, isDefaultView).then(function(result) {
                            removeCachedCurrentProgram();

                            var itemId = result.originalItemId;

                            var path = $location.path(), next;

                            /**
                             * if user enters keyword "lesson" in search text box and then opens lesson
                             * then url will become like community/search/lesson/lesson/:lessonId/1
                             * then path.split('/lesson/')[0] is creating issue
                             */
                            if (path.match('/lesson/lesson/')) { //DEPRECATED? Search in querystring
                                next = path.split('/lesson/lesson/')[0] + '/lesson/lesson/' + itemId + '/0';
                            } else {
                                next = path.split('/lesson/')[0] + '/lesson/' + itemId + '/0';
                            }

                            //$log.log("GO TO UPDATED LESSON", path, next);
                            $location.path(next);

                            Modal.hideDialog();
                        });
                    }
                };

                var confirm = function() {
                    updateDefaultView();
                };

                var modalScope = $scope.$new();
                modalScope.dialogId = 'removeCustomizedWarningModal';
                modalScope.title = lwcI18nFilter('editLesson.removeCustomizedLesson.title');
                modalScope.body = lwcI18nFilter('editLesson.removeCustomizedLesson.message');
                modalScope.isDismissible = false;
                modalScope.buttons = [
                    {
                        title: lwcI18nFilter('editLesson.action.cancel'),
                        clickHandler: closeModal
                    },
                    {
                        title: lwcI18nFilter('global.action.button.ok'),
                        clickHandler: confirm,
                        isDefault: true
                    }
                ];
                modalScope.closeBtnClickHandler = function() {
                    closeModal();
                };
                modalScope.dismissed = false;

                Modal.showDialog('templates/partials/simpleDialog.html', modalScope);
            };

            // Saves customized lesson
            $scope.save = function() {
                if ($scope.isSaveInProgress) {
                    return;
                }

                $scope.isSaveInProgress = true;
                saveModalDismissed = true;

                //This should be called in case of we are coming from save method of  unsavedModelchange.js
                if (proceededWithSave &&
                        $scope.selectedSearchItems &&
                        $scope.selectedSearchItems.objects &&
                        $scope.selectedSearchItems.objects.length > 0) {
                    $scope.done();
                    proceededWithSave = false;
                }

                // show progress bar
                var progressModal = Modal.progressDialog($scope.$new(), {
                    progressHeader: lwcI18nFilter('editLesson.updateProgress.title'),
                    progressMessage: lwcI18nFilter('editLesson.updateProgress.message')
                }).then(function() {
                    progressModal.fakeProgress();
                });

                //create object to send to server
                var detailedItemPromise = updateLessonModel();

                var addToLibrary = function(detailedItem) {
                    return MyContent.addContentItemToMyLibrary(detailedItem, detailedItem.originalItemId);
                };

                var completeProgress = function(addToLibResponse) {
                    var progressCompleted = $q.defer();

                    progressModal.then(function() {
                        progressModal.progressComplete().then(function() {
                            Modal.hideDialog();
                            $scope.isSaveInProgress = false;
                            progressCompleted.resolve(addToLibResponse.item[0]);
                        });
                    });

                    return progressCompleted.promise;
                };

                var switchView = function(addedItem) {
                    setAlert();
                    removeCachedCurrentProgram();
                    if (!$scope.saveRequestFromModal) {
                        openLessonView(addedItem);
                    } else {
                        $scope.saveRequestFromModal = false;
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

            $scope.back = function() {
                var path = $location.path();
                var next;

                if ($scope.reorderModeIsOn) {
                    next = path.split('/reorder')[0];
                } else if ($rootScope.addItemSearchResults) {
                    $scope.cancelAddItemSearch();
                    return;
                } else if ($routeParams.keywords) {
                    next = path.split('/search')[0] + '/search';
                } else {
                    $scope.goBack();
                    return;
                }

                $scope.goBack(next, true);
            };

            $scope.cancel = function() {
                saveModalDismissed = true;
                $scope.back();
            };

            // Manage Items Removed from Lesson
            $scope.undoIsOn = {};
            $scope.removedItems = {};

            $scope.removeItem = function(itemId) {
                $scope.showUndo(itemId);
                $scope.removedItems[itemId] = true;
            };

            $scope.undoRemoveItem = function(itemId) {
                $scope.removedItems[itemId] = false;
                $scope.undoIsOn[itemId] = false;
            };

            $scope.showUndo = function(itemId) {
                $scope.undoIsOn[itemId] = true;
            };

            // Manage Items Added to Lesson
            $scope.Items = {};

            //user entered text items... i.e. Learning Models and Student Voices added by user
            $scope.updatedItems = {};

            $scope.createAndAddItemToJson = function(newItemPosition, newItem) {
                $scope.newItem = newItem;

                //create temporary id
                newItem.tempId = 'tempId_' + (currentTemporaryId++);

                if (newItem.mediaType === 'Learning Model' || newItem.mediaType === 'Student Voice') {
                    $scope.updatedItems[newItem.tempId] = true;
                }

                $scope.contentItemsListForEdit.splice(newItemPosition, 0, $scope.newItem);
            };

            $scope.addEmptyNote = function(newNotePosition) {
                var emptyNote = {
                    mediaType: 'Student Voice',
                    fileType: 'TXT',
                    title: 'Default Student Voice Title'
                };

                $scope.createAndAddItemToJson(newNotePosition, emptyNote);
            };

            $scope.addEmptyHeader = function(newHeaderPosition) {
                var emptyHeader = {
                    mediaType: 'Learning Model',
                    fileType: 'Sequence',
                    associativeProps: {}
                };

                $scope.createAndAddItemToJson(newHeaderPosition, emptyHeader);
            };

            // Manage 'Add Items From Search'
            $scope.saveRequestFromModal = false;

            $scope.addItemFromSearch = function(newContentItemPosition) {
                var searchProvider,
                    libraryItems,
                    stopQueryCompleteListener,
                    stopSearchProviderListener,
                    stopSearchResultsListener,
                    savedFilterData;

                var getLibraryName = function() {
                    return $scope.lesson.parentProgramNames ? $scope.lesson.parentProgramNames : $scope.lesson.library;
                };

                var resetScopeVars = function() {
                    $scope.selectedFacets = {};
                    libraryItems = getLibraryName();
                    $scope.selectedSearchItems = {ids: {}, objects: []};
                    $scope.searchParams = {
                        NOT_MEDIA_TYPE: [
                            'Teacher Support',
                            'Tier',
                            'Remediation',
                            'Learning Model',
                            'Student Voice',
                            'Lesson',
                            'Center Container',
                            'Center'
                        ],
                        facets: {LIBRARY_TITLE: libraryItems}
                    };
                };

                var createNewAddItemSession = function() {
                    $scope.searchProvider = ContentSource.PROVIDER.REALIZE;
                    searchProvider = new ContentSource($scope.searchProvider);
                    $scope.newContentItemPosition = newContentItemPosition;
                    resetScopeVars();

                    angular.forEach(ContentSource.PROVIDER, function(provider) {
                        provider = new ContentSource(provider);
                        provider.filterData.remove('search.addItem');
                    });
                };

                $scope.isExternalProvider = function() {
                    return $scope.searchProvider !== ContentSource.PROVIDER.REALIZE;
                };

                if ($rootScope.addItemSearchResults) {
                    var savedProvider = $rootScope.keyStore.get('addItemSearchResults.searchProvider');
                    $scope.searchProvider = savedProvider || ContentSource.PROVIDER.REALIZE;

                    if ($scope.isExternalProvider()) {
                        $scope.externalSearchProviderName = $scope.searchProvider;
                    }

                    searchProvider = new ContentSource($scope.searchProvider);
                    savedFilterData = searchProvider.filterData.get('search.addItem');
                    $scope.newContentItemPosition = savedFilterData.addItemPosition;
                    $scope.selectedFacets = savedFilterData.selectedFacets;
                    $scope.selectedSearchItems = savedFilterData.selectedSearchItems;
                    $scope.searchParams = savedFilterData.searchOptions;
                    $scope.contentItemsListForEdit = $rootScope.keyStore.get('lesson.contentItemsListForEdit');
                } else {
                    createNewAddItemSession();
                }

                // @param position - 'top' or 'bottom'
                $scope.showSearchInstruction = function(position) {
                    var showInstruction = false,
                        searchResultsFound = $scope.queryDone && !$scope.noMatchFound;
                    if (position === 'top') {
                        if (($scope.searchProvider !== ContentSource.PROVIDER.REALIZE) || searchResultsFound) {
                            // show instruction if doing external search. or if results are found for Realize Search
                            showInstruction = true;
                        }
                    } else if (position === 'bottom' && searchResultsFound) {
                        // show instruction only if results are found for any Search
                        showInstruction = true;
                    }

                    return showInstruction;
                };

                $scope.showExtProviderZeroStateInstruction = function() {
                    return $scope.isExternalProvider() &&
                        (!$scope.queryDone || $scope.noMatchFound);
                };

                $scope.showExtProviderResultsFoundInstruction = function() {
                    return $scope.isExternalProvider() &&
                        $scope.queryDone && !$scope.noMatchFound;
                };

                stopQueryCompleteListener = $scope.$on('searchResults.queryCompleted', function(evt, data) {
                    $scope.noMatchFound = (data.resultCount === 0);
                    $scope.queryDone = true;
                });

                stopSearchProviderListener = $scope.$on('searchResults.searchProvider.toggled', function(ev, provider) {
                    var searchProvider = new ContentSource($scope.searchProvider),
                        filterData;

                    // save filter data before we switch
                    searchProvider.filterData.set('search.addItem', {
                        searchOptions: $scope.searchParams,
                        selectedFacets: $scope.selectedFacets,
                        selectedSearchItems: $scope.selectedSearchItems
                    });

                    $scope.queryDone = false;

                    $scope.searchProvider = provider;
                    searchProvider = new ContentSource($scope.searchProvider);

                    if ($scope.isExternalProvider()) {
                        $scope.externalSearchProviderName = $scope.searchProvider;
                        $rootScope.keyStore.add('addItemSearchResults.searchProvider', $scope.searchProvider);
                    }

                    filterData = searchProvider.filterData.get('search.addItem');

                    if (filterData) {
                        $scope.selectedSearchItems = filterData.selectedSearchItems || {ids: {}, objects: []};
                        $scope.searchParams = filterData.searchOptions;
                        $scope.selectedFacets = filterData.selectedFacets;
                    } else {
                        resetScopeVars();
                    }
                });

                stopSearchResultsListener = $scope.$on('searchResults.exiting', function(ev, filterData) {
                    var searchProvider = new ContentSource($scope.searchProvider);
                    filterData.addItemPosition = newContentItemPosition;
                    filterData.selectedSearchItems = $scope.selectedSearchItems;
                    searchProvider.filterData.set('search.addItem', filterData);
                    $rootScope.keyStore.add('addItemSearchResults.searchProvider', $scope.searchProvider);
                });

                $scope.cancelAddItemSearch = function() {
                    stopQueryCompleteListener();
                    stopSearchProviderListener();
                    stopSearchResultsListener();
                    $rootScope.addItemSearchResults = false;
                    $scope.selectedFacets = {};
                    $scope.queryDone = false;
                    $scope.totalMatches = 10;
                };

                $scope.done = function() {
                    $scope.cancelAddItemSearch();

                    // collect all selected search items
                    var selectedSearchItems = $scope.selectedSearchItems.objects;
                    angular.forEach(ContentSource.PROVIDER, function(provider) {
                        var savedSearchData,
                            itemsFromProvider;

                        if (provider !== $scope.searchProvider) {
                            savedSearchData = new ContentSource(provider).filterData.get('search.addItem');
                            if (savedSearchData) {
                                itemsFromProvider = savedSearchData.selectedSearchItems;
                                if (itemsFromProvider) {
                                    selectedSearchItems = selectedSearchItems.concat(itemsFromProvider.objects);
                                }
                            }
                        }
                    });

                    selectedSearchItems = _.uniq(selectedSearchItems);

                    angular.forEach(selectedSearchItems, function(searchItem) {
                        $scope.createAndAddItemToJson($scope.newContentItemPosition, searchItem);
                        $scope.contentItemsListForEdit = _.uniq($scope.contentItemsListForEdit);
                        InlineAlertService.addAlert(
                            searchItem.id,
                            {
                                type: 'success',
                                msg: [
                                    lwcI18nFilter('editLesson.successNotification.addItem.title'),
                                    lwcI18nFilter('editLesson.successNotification.addItem.message')
                                ].join(' ')
                            }
                        );
                    });
                };

                $rootScope.addItemSearchResults = true;
            };

            if ($rootScope.addItemSearchResults) {
                $scope.addItemFromSearch();
            }

            var unsavedChangesModal = new UnsavedChangesModal(function() {
                $scope.saveRequestFromModal = true;
                proceededWithSave = true;
                return $scope.save();
            });

            $scope.$on('$locationChangeStart', function(event, next) {
                $scope.pageLoaded();
                if (saveModalDismissed) {
                    return;
                }

                var currentListForEdit = angular.copy($scope.contentItemsListForEdit);
                currentListForEdit = removeItems(currentListForEdit);

                var itemsWereSelectedFromSearch = $scope.selectedSearchItems &&
                        $scope.selectedSearchItems.objects.length > 0,
                    listHasBeenEdited = !angular.equals(pristineListForEdit, currentListForEdit),
                    goingToContentViewer = (next.indexOf('/content/') >= 0);

                if (goingToContentViewer) {
                    $rootScope.keyStore.add('lesson.contentItemsListForEdit', $scope.contentItemsListForEdit);
                } else {
                    if (itemsWereSelectedFromSearch || listHasBeenEdited) {
                        unsavedChangesModal.showDialog(event).catch(function() {
                            $rootScope.viewLoading = false;
                        });
                    } else if ($rootScope.addItemSearchResults) {
                        $rootScope.addItemSearchResults = false;
                    }
                }
            });

            $scope.closeUploadView = function($event) {
                if ($event) {
                    $event.preventDefault();
                }
                $scope.uploadView = false;
                newUploadPosition = undefined;
            };

            $scope.onUploadSuccess = function(type, data) {
                $scope.createAndAddItemToJson(newUploadPosition, data.item);
                $scope.closeUploadView();
            };

            $scope.onUploadFailure = function(type, error) {
                $log.error('EditLesson: onUploadFailure type:', type, 'error:', error);
            };

            $scope.addContentToLesson = function(newLinkPosition, type) {
                $scope.uploadView = type;
                newUploadPosition = newLinkPosition;
            };

            $scope.showKeyboardInstDialog = function(e) {
                e.preventDefault();
                e.stopPropagation();

                var closeModal = function() {
                    Modal.hideDialog();
                };

                var modalScope = $scope.$new();
                modalScope.dialogId = 'lessonReorderKeyboardInstDialog';
                modalScope.title = lwcI18nFilter('global.accessibility.reorder.title');
                modalScope.body = lwcI18nFilter('global.accessibility.reorder.message.lesson');
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

            /**
             * Get the title for an item using Content's $getTitle. The new item is not
             * turned into a "Content" object so that it will not inherit
             * properties that shouldn't be sent to the server.
             *
             * @returns The title value to use
             */
            $scope.getTitle = function(item) {
                var tempContentItem = new Content(item);
                $scope.lessonTitle = tempContentItem.$getTitle('original');
                return $scope.lessonTitle;
            };
        }
    ]);
