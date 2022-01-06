/**
 *
 * @param {jQuery} $
 * @param repo
 * @param {AlertPopup.alert} popup
 * @constructor
 */
var GitHubAPI = function ($, repo, popup) {
    this._currentToken = localStorage.getItem('token');
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
    this.checkoutTexts = function(branch, path, filename, proxyUri){
        var textsLoading = $.Deferred();
        var ghAPIgetFile = this.getFile.bind(this);

        this
            .getFolderContent(branch, path, filename)
            .done(function (files) {
                var fileNames = Object.keys(files);

                // Вызывае when через apply чтобы передать массивом загрузчики
                $.when.apply($, fileNames.map(function (fileName) {
                    var fileUrl = files[fileName];

                    return ghAPIgetFile(fileUrl, proxyUri);
                })).done(function () {
                    if (fileNames.length !== arguments.length) {
                        textsLoading.reject('Ошибка загрузки файлов [ghAPI:checkoutTexts]');
                        return;
                    }

                    var allFiles = Array.prototype.reduce.call(arguments, function (allFilesContent, fileContent, index) {
                        var fileName = fileNames[index];

                        allFilesContent[fileName] = fileContent;

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
        var setFileSha = this.setFileSha.bind(this);
        var setFilePath = this.setFilePath.bind(this);
        var token = this._currentToken;

        popup('Загружается список переводов...', 'info');
        // https://docs.github.com/en/rest/reference/repos#get-repository-content
        return $.ajax({
                method: 'GET',
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
                    files = data
                        .filter(function (item) {
                            return item.type === 'file' && item.name.indexOf(filename + '.') === 0
                        })
                        .reduce(function (acc, file) {
                            acc[file.name] = file.git_url;
                            setFileSha(file.name, file.sha);
                            setFilePath(file.name, file.path);
                            return acc;
                        }, {});

                    allFileNames = Object.keys(files).join('<br>');
                    popup('Найдено '+ filesCount + ':<br>' + allFileNames, 'success');

                    return files;
                }
            }, function (error) {
                console.error(error);
                popup(error.responseJSON.message, 'danger');
            });
    };

    this.getFile = function(fileURL, proxyUri) {
        var token = this._currentToken;

        return $.ajax({
                method: 'GET',
                url: fileURL,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Accept', null);
                    xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
                    xhr.setRequestHeader('Authorization', 'token ' + token);
                }
            })
            .then(function (data) {
                return decodeURIComponent(escape(window.atob(data.content)));
            }, function (error) {
                console.error(error);
                popup(error.responseJSON.message, 'danger');
                throw new Error(error.responseJSON.message);
            });
    };

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

    /**
     * Этот метод создает коммит с изменениями в одном файле.
     * Возвращает jQuery promise который при успешном результате ресолвится хешом успешного коммита
     *
     * @param {string} content - текст который пушим
     * @param {string} filePath - путь к файлу в который коммитим
     * @param {string} branchName - имя ветки
     * @param {string} parentCommit - sha хеш от какого коммита вносятся изменения в файл
     * @returns {*|PromiseLike<T>|Promise<T>}
     */
    this.pushCommit = function (content, fileName, branchName) {
        var that = this;
        var token = this._currentToken;
        var filePath = this._files[fileName].path;
        var fileSha = this._files[fileName].sha;
        var post = {
            message: 'Sync ' + fileName,
            branch: branchName,
            content: this.textToBase64(content),
            sha: fileSha
        };

        // https://docs.github.com/en/rest/reference/repos#create-or-update-file-contents
        return $
            .ajax({
                method: 'PUT',
                url: 'https://api.github.com/repos/' + that._repo + '/contents/' + filePath,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('Accept', null);
                    xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');
                    xhr.setRequestHeader('Authorization', 'token ' + token);
                },
                data: JSON.stringify(post)
            })
            .then(function (data) {
                console.log('Commit saved', data);
                that.setFileSha(fileName, data.content.sha);
                return data;
            }, function (err) {
                console.log(err);
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
            .fail(function (err) {
                popup('Не удалось получить данные пользователя.<br>Ошибка: [' + err.responseJSON.message + ']', 'danger');
            });
    }
};
