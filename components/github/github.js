/**
 *
 * @param {jQuery} $
 * @param repo
 * @param {AlertPopup.alert} popup
 * @constructor
 */
var GitHubAPI = function ($, repo, popup) {
    this._currentToken = localStorage.getItem('token');
    this._currentUserEmail = null;
    this._currentUserName = null;
    // this._currentUserLogin = '';
    // this._currentDoc = '';
    this._repo = repo;
    this._files = {
        'filename.ru.md': {
            hash: 'dev-file-hash',
            path: 'github.com/path',
        }
    };

    /**
     * Возвращает тексты из папки
     * @param branch
     * @param path
     * @param filename
     * @returns {*|PromiseLike<T>|Promise<T>}
     */
    this.checkoutTexts = function(branch, path, filename){
        var textsLoading = $.Deferred();
        var ghAPIgetFile = this.getFile.bind(this);

        this
            .getFolderContent(branch, path, filename)
            .done(function (files) {
                var fileNames = Object.keys(files);

                // Вызывае when через apply чтобы передать массивом загрузчики
                $.when.apply($, fileNames.map(function (fileName) {
                    var fileUrl = files[fileName];

console.log(fileName, fileUrl)
                    return ghAPIgetFile(fileUrl);
                })).done(function () {
                    if (fileNames.length !== arguments.length) {
                        textsLoading.reject('Ошибка загрузки файлов [ghAPI:checkoutTexts]');
                        return;
                    }

                    var allFiles = Array.prototype.reduce.call(arguments, function (allFilesContent, fileContent, index) {
                        var fileName = fileNames[index];

                        allFilesContent[fileName] = fileContent[0];

                        return allFilesContent;
                    }, {});

                    textsLoading.resolve(allFiles);
                }).fail(function () {
                    textsLoading.reject('Ошибка загрузки всех файлов');
                })
            })
            .fail(function () {
                textsLoading.reject('It can\'t download ' + path + '/' + filename + '.* content from "' + branch + '" branch');
            });

        return textsLoading.promise();
    };

    /**
     * Возвращает jQuery promise и при успешном результате данные в формате имя_файла=url
     * @param branch
     * @param path
     * @param filename
     * @returns {*|PromiseLike<T>|Promise<T>}
     */
    this.getFolderContent = function(branch, path, filename) {
        // var setDoc = this.setCurrentDoc.bind(this);
        var setFileSha = this.setFileSha.bind(this);
        var setFilePath = this.setFilePath.bind(this);
        var token = this._currentToken;

        popup('Загружается список переводов...', 'info');
        // https://docs.github.com/en/rest/reference/repos#get-repository-content
        return $.ajax({
                method: "GET",
                url: 'https://api.github.com/repos/' + this._repo + '/contents/' + path + '?ref=' + branch,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Accept', null);
                    xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
                    xhr.setRequestHeader('Authorization', 'token ' + token);
                }
            })
            .then(function (data) {
                var filesCount = data && data.length;
                var files;
                var allFileNames;

                if (filesCount) {
                    // Сохраняем тайтл документа для названия ветки куда будем комиттить
                    // setDoc(data[0].name);

                    files = data
                        .filter(function (item) {
                            return item.type === 'file' && item.name.indexOf(filename + '.') === 0
                        })
                        .reduce(function (acc, file) {
                            acc[file.name] = file.download_url;
                            setFileSha(file.name, file.sha);
                            setFilePath(file.name, file.path);
console.log('[', acc, ']');
                            return acc;
                        }, {});

                    allFileNames = Object.keys(files).join('<br>');
                    popup('Найдено '+ filesCount + ':<br>' + allFileNames, 'success');

console.log(files);
                    return files;
                }
            }, function () {
                popup('Не удалось загрузить ' + url, 'danger');
            });
    };

    this.getFile = function(fileURL) {
        var url = new URL(fileURL);
        var token = this._currentToken;
        url.password = token;
        return $.get(url.toString());

        // var token = this._currentToken;
        // var headers = new Headers();
        // headers.append('Accept','text/plain; charset=UTF-8');
        // // headers.append('Authorization', 'token ' + token);
        // return fetch(fileURL, headers)
        //     .then(function (response) {
        //         // var data = response.text();
        //         // console,log('LLLLLLLLLLL', data.length);
        //         // return data;
        //         return response.text();
        //     });
//         var token = this._currentToken;
// console.log('>>>', fileURL, '|||', token, '<<<');
//         return $.ajax({
//             url: fileURL,
//             xhrFields: {
//                 withCredentials: true
//             },
//             crossDomain: true,
//             dataType: 'text',
//             beforeSend: function (xhr) {
//                 xhr.setRequestHeader('Accept', null);
//                 xhr.setRequestHeader('Accept', 'text/plain; charset=utf-8');
//                 xhr.setRequestHeader('Authorization', 'token ' + token);
//             }
//         });
    };

    // this.setCurrentDoc = function (firstFileName) {
    //     this._currentDoc = firstFileName.substr(0, firstFileName.indexOf('.'));
    // };

    this.setFileSha = function (fileName, fileSha) {
        var file = this._files[fileName] || (this._files[fileName] = {});

        file.sha = fileSha;
    }
    this.setFilePath = function (fileName, filepath) {
        var file = this._files[fileName] || (this._files[fileName] = {});

        file.path = filepath;
    }

    /**
     * Возвращает сконвертированный Unicode текст в формате base64, совместимый с github
     * @param {string} text - исходная Unicode строка
     * @returns {string}
     */
    this.textToBase64 = function (text) {
        return btoa(unescape(encodeURIComponent(text)));
    }

    // this.getMasterBranchHash = function () {
    //     return $
    //         .get('https://api.github.com/repos/prosvita/QIRIMTATARTILI/branches/master')
    //         .then(function (masterBranch) {
    //             return masterBranch.commit.sha;
    //         }, function (err) {
    //             popup('Не удалось узнать хеш мастер ветки. Ошибка:' + err, 'danger');
    //         });
    // }

    /**
     * Возвращает jQuery promise который при успешном результате ресолвится данными
     *
     * @param {string} branchName - имя будущей ветки
     * @param {string} parentBranchHash - sha хеш от какой ветки отводить новую ветку
     * @returns {*|PromiseLike<T>|Promise<T>}
     */
    // this.createBranch = function () {
    //     var branchPath = 'refs/heads/' + this._currentUserLogin + '/' + this._currentDoc;
    //     var token = this._currentToken;

    //     popup('Создается ветка для сохранения...', 'info');
    //     return this
    //         .getMasterBranchHash()
    //         .then(function (parentBranchHash) {
    //             return $
    //                 .ajax({
    //                     method: "POST",
    //                     url: "https://api.github.com/repos/prosvita/QIRIMTATARTILI/git/refs",
    //                     beforeSend: function (xhr) {
    //                         xhr.setRequestHeader('Authorization', 'token ' + token);
    //                     },
    //                     data: JSON.stringify({
    //                         ref: branchPath,
    //                         sha: parentBranchHash
    //                     })
    //                 })
    //                 .fail(function(err) {
    //                     popup('Не удалось создать ветку ' + branchPath + ' Ошибка: ' + err.responseJSON.message, 'danger');
    //                 });
    //         });
    // };

    /**
     * Этот метод создает коммит с изменениями в одном файле.
     * Возвращает jQuery promise который при успешном результате ресолвится хешом успешного коммита
     *
     * @param {string} content - текст который пушим
     * @param {string} filePath - путь к файлу в который коммитим
     * @param {string} branchName - имя будущей ветки
     * @param {string} parentCommit - sha хеш от какого коммита вносятся изменения в файл
     * @returns {*|PromiseLike<T>|Promise<T>}
     */
    this.pushCommit = function (content, fileName, branchName) {
        var fileSha = this._files[fileName].sha;
        var post = {
            message: 'Sync ' + fileName,
            committer: {
                name: this._currentUserName,
                email: this._currentUserEmail
            },
            branch: branchName,
            content: this.textToBase64(content),
            sha: fileSha
        };
        var token = this._currentToken;
        var filePath = this._files[fileName].path;

        // https://docs.github.com/en/rest/reference/repos#create-or-update-file-contents
        return $
            .ajax({
                method: 'PUT',
                url: 'https://api.github.com/repos/prosvita/QIRIMTATARTILI/contents/' + filePath,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Accept', null);
                    xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
                    xhr.setRequestHeader('Authorization', 'token ' + token);
                },
                data: JSON.stringify(post)
            })
            .done(function (msg) {
                console.log('done triggered', msg)
            }).fail(function (err) {
                popup('Не удалось отправить изменения в файле ' + filePath + ' Ошибка:' + err, 'danger');
            });
    }

    /**
     * Этот метод подтягивает инфу о залогиненном пользователе.
     * Возвращает jQuery promise который при успешном результате ресолвится хешом успешного коммита
     *
     * @returns {*|PromiseLike<T>|Promise<T>}
     */
    this.getUser = function () {
        var token = this._currentToken;

        return $
            .ajax({
                method: 'GET',
                url: 'https://api.github.com/user',
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Accept', null);
                    xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
                    xhr.setRequestHeader('Authorization', 'token ' + token);
                }
            })
            .done(function (userData) {
                // this._currentUserLogin = userData.login;
                this._currentUserEmail = userData.email;
                this._currentUserName = userData.name;
            }.bind(this)).fail(function (err) {
                popup('Не удалось получить данные пользователя.<br>Ошибка: [' + err.responseJSON.message + ']', 'danger');
            });
    }
};

