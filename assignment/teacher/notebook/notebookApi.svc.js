angular.module('Realize.assignment.teacher.notebook.apiService', [
    'Realize.assignment.teacher.notebook.constants',
    'Realize.constants.mediaType',
    'Realize.paths',
    'NotebookApp'
])
    .factory('NotebookApiService', [
        '$q',
        'REST_PATH',
        '$http',
        'webStorage',
        'NotebookService',
        'NotebookUIConfigService',
        'NOTEBOOK_CONSTANTS',
        '$window',
        '$location',
        '$route',
        'MEDIA_TYPE',
        'AssignmentUtil',
        '$log',
        '$rootScope',
        function($q, REST_PATH, $http, webStorage, NotebookService, NotebookUIConfigService,
            NOTEBOOK_CONSTANTS, $window, $location, $route, MEDIA_TYPE, AssignmentUtil, $log, $rootScope) {
            'use strict';
            NotebookUIConfigService.setShowAllNotesHeader(false);
            NotebookUIConfigService.setShowAllNotesDisplayOptions(false);
            NotebookUIConfigService.setShowAllNotesHeader(false);
            NotebookUIConfigService.setEditEnabled(false);
            NotebookUIConfigService.setShowUnansweredPrompts(true);
            NotebookUIConfigService.setShowZeroStateMessages(true);
            NotebookUIConfigService.setUseSnapshot(true);
            var service = {},

                getFromStorage = function(prefix) {
                    return webStorage.get(prefix);
                },

                storeNotebookData = function(prefix, notebookIdOrToc) {
                    webStorage.add(prefix, notebookIdOrToc);
                },

                getNotebookId = function(bookDetails) {
                    var realizeBookId = bookDetails.bookId,
                        bookId = getFromStorage(NOTEBOOK_CONSTANTS.PREFIX.NOTEBOOK_ID.concat(realizeBookId));
                    if (bookId) {
                        return $q.when(bookId);
                    } else {
                        return NotebookService.createBook($window.realizeReaderAppName,
                            realizeBookId).then(function(bookId) {
                            storeNotebookData(NOTEBOOK_CONSTANTS.PREFIX.NOTEBOOK_ID.concat(realizeBookId), bookId);
                            return bookId;
                        }, function(error) {
                            $q.reject(error);
                        });
                    }
                },

                getToc = function(bookDetails) {
                    var toc = getFromStorage(NOTEBOOK_CONSTANTS.PREFIX.NOTEBOOK_TOC.concat(bookDetails.tocKey));
                    if (toc) {
                        return $q.when(JSON.parse(toc));
                    } else {
                        return $http({
                            url: REST_PATH + '/toc/' + bookDetails.bookId,
                            method: 'GET',
                            params: {
                                'pageNumbers': bookDetails.pages,
                                'pageInfoType': bookDetails.pageInfoType
                            }
                        }).then(function(response) {
                            angular.forEach(response.data.units, function(unit) {
                                unit.pages = unit.pages || [];
                            });
                            storeNotebookData(NOTEBOOK_CONSTANTS.PREFIX.NOTEBOOK_TOC.concat(bookDetails.tocKey),
                                JSON.stringify(response.data));
                            return response.data;
                        }, function(err) {
                            return $q.reject('error getting toc', err);
                        });
                    }
                },

                getContentItem = function() {
                    var items = service.assignmentData.assignment.contentItem.contentItems,
                        toMatch = { id: $location.search().contentId },
                        contentItem =  _.findWhere(items, toMatch);
                    if (!contentItem) {
                        for (var i = 0; i < items.length; ++i) {
                            if (items[i].mediaType === MEDIA_TYPE.LEARNING_MODEL && items[i].contentItems.length) {
                                contentItem =  _.findWhere(items[i].contentItems, toMatch);
                                if (contentItem) {
                                    return contentItem;
                                }
                            }
                        }
                    }
                    return contentItem;
                },

                getBookDetails = function() {
                    var realizeBookId = service.assignmentData.assignment.contentItem.bookId,
                        pages,
                        contentItem,
                        tocStorageKey,
                        pageType;
                    if (realizeBookId) {
                        pages = service.assignmentData.assignment.contentItem.pages;
                        tocStorageKey = service.assignmentData.assignment.assignmentId;
                        pageType = service.assignmentData.assignment.contentItem.pageInfoType;
                    } else if ($location.search().contentId) {
                        contentItem = getContentItem();
                        realizeBookId = contentItem.bookId;
                        pages = contentItem.pages;
                        tocStorageKey = $location.search().contentId;
                        pageType = contentItem.pageInfoType;
                    }
                    return {
                        bookId: realizeBookId,
                        pages: pages,
                        tocKey: tocStorageKey,
                        pageInfoType: pageType
                    };
                };

            service.resolveNotebookToc = function() {
                var bookDetails = getBookDetails();
                NotebookUIConfigService.setSnapshotId($route.current.params.userAssignmentId);
                return getNotebookId(bookDetails).then(function(notebookId) {
                    NotebookService.currentBookId = notebookId;
                    return getToc(bookDetails).then(function(toc) {
                        return NotebookService.resolveToc(toc).then(function(data) {
                            return data;
                        });
                    });
                });
            };

            service.resolveNotebookTocAppSync = function(currentStudent) {
                var bookDetails = getBookDetails();
                NotebookService.setAppSyncContext({
                    bookContext: bookDetails.bookId,
                    userId: currentStudent.studentUuid,
                    app: $window.realizeReaderAppName
                });
                NotebookUIConfigService.setSnapshotId($route.current.params.userAssignmentId);
                return getToc(bookDetails).then(function(toc) {
                    return NotebookService.resolveToc(toc).then(function(data) {
                        return data;
                    }).catch(function(error) {
                        $log.error('Error in notebook app sync', error);
                        $rootScope.$emit('notebook.server.error', error);
                    });
                });
            };

            service.getPageTitle = function() {
                var search = $location.search();
                return (search && search.contentId) ? getContentItem().$getTitle() :
                    service.assignmentData.assignment.$getTitle();
            };

            service.getCompletedStudentList = function() {
                var search = $location.search();
                var studentList = [].concat(service.assignmentData.completedList);
                if (search && search.contentId) {
                    studentList.map(function(student) {
                        student.userAssignmentId = service.assignmentData.assignment.
                        $findItemMetadata(search.contentId, student.studentInfo.userId).userAssignmentId;
                    });
                }
                return AssignmentUtil.sortByStudentName(studentList);
            };

            return service;
        }
    ]);
