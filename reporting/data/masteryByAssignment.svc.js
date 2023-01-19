angular.module('Realize.reporting.MasteryByAssignmentService', [])
    .service('MasteryByAssignmentService',
        function() {
            'use strict';
            var service = this,
                savedClassId,
                savedStandardPageNumber;
            service.getReportPage = function(pageNumber, pageSize, list) {
                list = list || [];
                var startIndex = (pageNumber - 1) * pageSize,
                    endIndex = startIndex + pageSize, page;
                if (endIndex > list.length) {
                    endIndex = list.length;
                }
                page = list.slice(startIndex, endIndex);
                var indexPerPage = endIndex - startIndex;
                var displayData =  pageSize - indexPerPage;
                var startingData = endIndex - (displayData + indexPerPage);
                if (startingData < 0) {
                    startingData = 0;
                }
                if (indexPerPage !== pageSize) {
                    startIndex = startingData;
                    page = list.slice(startIndex, endIndex);
                }
                return {
                    startIndex: startIndex,
                    endIndex: endIndex,
                    total: list.length,
                    totalPages: Math.ceil(list.length / pageSize),
                    pageNumber: pageNumber,
                    pageSize: pageSize,
                    list: page
                };
            };

            service.saveStandardPageNumber = function(classId, pageNumber) {
                savedStandardPageNumber = pageNumber;
                savedClassId = classId;
            };

            service.getSavedStandardPageNumber = function(classId) {
                if (savedClassId === classId) {
                    return savedStandardPageNumber;
                } else {
                    this.saveStandardPageNumber(classId, 1);
                    return 1;
                }
            };

            service.nameComparator = function(student1, student2) {
                return (student1.fullName).toLowerCase() < (student2.fullName).toLowerCase() ? -1 : 1;
            };

            service.scoreComparator = function(student1, student2, isAscending) {
                var comparedResult;
                var student1Score = student1.score ? student1.score.percentScore : -1;
                var student2Score = student2.score ? student2.score.percentScore : -1;
                if (isAscending && student1Score === student2Score) {
                    comparedResult = (student1.fullName).toLowerCase() <
                    (student2.fullName).toLowerCase() ? -1 : 1;
                } else if (!isAscending && student1Score === student2Score) {
                    comparedResult = (student1.fullName).toLowerCase() >
                    (student2.fullName).toLowerCase() ? -1 : 1;
                } else {
                    comparedResult = student1Score < student2Score ? -1 : 1;
                }
                return comparedResult;
            };

            service.sortStandardsByPercentScore = function(standardsList, sortByDesc) {
                var sortedStandardsList = _.sortBy(standardsList, 'percentScore', 'standardId');
                return sortByDesc ? sortedStandardsList.reverse() : sortedStandardsList;
            };
        }
    );
