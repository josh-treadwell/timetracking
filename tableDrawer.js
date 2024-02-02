define('_ujgTimeTableDrawer', ['jquery', '_ujgTimeUtil'], function ($, timeUtil) {
    var EventsProvider = function () {
        return {

            drawByIssue: function (dataParams, eventsArr, container) {
                var issuesObj = this._groupByIssues(eventsArr),
                    currentDate = new Date(dataParams.start),
                    totalHrs = {},
                    tableHtml = "<table><tr>";
                tableHtml += "<th>Issue</th><th>Description</th><th>Total</th>";
                while (currentDate < dataParams.end) {
                    tableHtml += "<th>" + timeUtil.formatShortDate(currentDate) + "</th>";
                    currentDate = timeUtil.addDays(currentDate, 1);
                }
                tableHtml += "</tr>";
                for (i = 0; i < issuesObj.issuesArr.length; i++) {
                    var issueObj = issuesObj.issuesArr[i];
                    tableHtml += "<tr class='" + (i % 2 === 1 ? "odd" : "even") + "'><td>" + issueObj.key + "</td><td>" + issueObj.description + "</td><td>" +
                        timeUtil.formatDurationInHrs(issueObj.timeSpentSeconds) + "</td>";
                    currentDate = new Date(dataParams.start);
                    while (currentDate < dataParams.end) {
                        var dateFormated = timeUtil.formatSystemDate(currentDate),
                            secondsVal = issueObj.dates[dateFormated];
                        tableHtml += "<td>" + (secondsVal !== undefined ? timeUtil.formatDurationInHrs(secondsVal) : "&nbsp;") + "</td>";
                        if (secondsVal !== undefined) {
                            if (totalHrs[dateFormated] !== undefined) {
                                // sum with previous value
                                totalHrs[dateFormated] += secondsVal;
                            } else {
                                totalHrs[dateFormated] = secondsVal;
                            }
                        }
                        currentDate = timeUtil.addDays(currentDate, 1);
                    }
                    tableHtml += "</tr>";
                }
                tableHtml += "<tr class='total'><td>Total:</td><td></td><td>" + timeUtil.formatDurationInHrs(issuesObj.timeSpentSeconds) + "</td>";
                currentDate = new Date(dataParams.start);
                while (currentDate < dataParams.end) {
                    var dayTotal = totalHrs[timeUtil.formatSystemDate(currentDate)];
                    tableHtml += "<td>" + (dayTotal !== undefined ? timeUtil.formatDurationInHrs(dayTotal) : "&nbsp;") + "</td>";
                    currentDate = timeUtil.addDays(currentDate, 1);
                }
                tableHtml += "</tr></table>";
                container.append(tableHtml);
            },

            _groupByIssues: function (eventsArr) {
                var issuesObj = {}, issueKeyToArr = {}, i;
                issuesObj.issuesArr = [];
                issuesObj.timeSpentSeconds = 0;
                for (i = 0; i < eventsArr.length; i++) {
                    var worklogEvent = eventsArr[i],
                        issueObj = issueKeyToArr[worklogEvent.issueKey],
                        logDate = timeUtil.formatSystemDate(worklogEvent.startedDate),
                        wlTime = worklogEvent.timeSpentSeconds;

                    issuesObj.timeSpentSeconds += worklogEvent.timeSpentSeconds;

                    if (issueObj === undefined) {
                        // create and push issueObj
                        issueObj = {};
                        issueObj.key = worklogEvent.issueKey;
                        issueObj.dates = {};
                        issueObj.timeSpentSeconds = 0;
                        issuesObj.issuesArr.push(issueObj);
                        issueKeyToArr[worklogEvent.issueKey] = issueObj;
                    }

                    issueObj.timeSpentSeconds += wlTime;

                    if (issueObj.dates[logDate] !== undefined) {
                        // sum with previous entries
                        wlTime += issueObj.dates[logDate];
                    }
                    issueObj.dates[logDate] = wlTime;
                }
                // sort by issue keys
                issuesObj.issuesArr.sort(function (a, b) {
                    return a.key.localeCompare(b.key);
                });
                return issuesObj;
            }

        };
    };
    var eventsProvider = new EventsProvider();
    return eventsProvider;
});
