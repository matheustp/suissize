'use strict'
const vscode = require('vscode')
const standardFormat = require('standard-format')

const replaceParenthesis = (text) => {
  const regexOpeningParenthesis = /(\()(\b|\(|\'|\`|\"|\{|\[)/g
  const regexClosingParenthesis = /(\b|\)|\'|\`|\"|\}|\])(\))/g
  const fixNestedOpeningParenthesis = /(\()(\()/g
  const fixNestedClosingParenthesis = /(\))(\))/g
  return text.replace(regexOpeningParenthesis, `$1 $2`)
    .replace(regexClosingParenthesis, `$1 $2`)
    .replace(fixNestedClosingParenthesis, `$1 $2`)
    .replace(fixNestedOpeningParenthesis, `$1 $2`)
}

const replaceCurlyBrackets = (text) => {
  const regexOpeningCurlyBrackets = /(\{)(\b|\(|\'|\`|\"|\{|\[)/g
  const regexClosingCurlyBrackets = /(\b|\)|\'|\`|\"|\}|\])(\})/g
  const fixNestedOpeningCurlyBrackets = /(\{)(\{)/g
  const fixNestedClosingCurlyBrackets = /(\})(\})/g
  return text.replace(regexOpeningCurlyBrackets, `$1 $2`)
    .replace(regexClosingCurlyBrackets, `$1 $2`)
    .replace(fixNestedClosingCurlyBrackets, `$1 $2`)
    .replace(fixNestedOpeningCurlyBrackets, `$1 $2`)
}

const replaceSquareBrackets = (text) => {
  const regexOpeningSquareBrackets = /(\[)(\b|\(|\'|\`|\"|\{|\[)/g
  const regexClosingSquareBrackets = /(\b|\)|\'|\`|\"|\}|\])(\])/g
  const fixNestedOpeningSquareBrackets = /(\[)(\[)/g
  const fixNestedClosingSquareBrackets = /(\])(\])/g
  return text.replace(regexOpeningSquareBrackets, `$1 $2`)
  .replace(regexClosingSquareBrackets, `$1 $2`)
  .replace(fixNestedClosingSquareBrackets, `$1 $2`)
  .replace(fixNestedOpeningSquareBrackets, `$1 $2`)
}

const replaceEqualSymbol = (text) => {
  const regexAfterEqual = /\=(\>?)(\b|\[|\(|\{)/g
  const regexBeforeEqual = /(\b|\]|\)|\})\=/g
  return text.replace(regexAfterEqual, `=$1 $2`).replace(regexBeforeEqual, `$1 =`)
}

const replaceFunction = (text) => {
  const regexAfterFunction = /function(\w|\()/g
  const regexAfterFunctionName = /function (\w+|\()(\()/g
  return text.replace(regexAfterFunction, `function $1`).replace(regexAfterFunctionName, `function $1 $2`)
}

const replaceComma = (text) => {
  const regexComma = /\,(\b|\(|\{|\[|\'|\"|\`)/g
  return text.replace(regexComma, `, $1`);
}

const replaceColon = (text) => {
  const regexColon = /\:(\b|\(|\{|\[|\'|\"|\`)/g
  return text.replace(regexColon, `: $1`);
}

function suissize(option) {
  let editor = vscode.window.activeTextEditor
  if (!editor) return

  vscode.commands.executeCommand('acceptSelectedSuggestion').then(() => {
    let range
    let currentText
    if (option === 'formatLine') {
      let lineIndex = editor.selection.active.line
      let lineObject = editor.document.lineAt(lineIndex)
      let lineLength = lineObject.text.length
      let start = new vscode.Position(lineIndex, 0)
      let end = new vscode.Position(lineIndex, lineLength)
      range = new vscode.Range(start, end)
      currentText = lineObject.text
    } else {
      let document = editor.document
      let start = new vscode.Position(0, 0)
      let end = new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length)
      range = new vscode.Range(start, end)
      currentText = editor.document.getText(range)
    }

    //let currentText = editor.document.getText(range)
    //console.log("line " + lineObject.text)
    //console.log("full text" + currentText)
    let options = vscode.FormattingOptions
    if (!options) {
      options = { insertSpaces: true, tabSize: 2 }
    }

    if (!currentText.isEmptyOrWhitespace) {
      let insertionSuccess = editor.edit((editBuilder) => {
        let formatted;
        if (option === 'formatIndentCode') {
          try {
            formatted = standardFormat.transform(currentText)
          } catch (err) {
            vscode.window.showErrorMessage(err.message)
            return
          }
          formatted = replaceParenthesis(replaceSquareBrackets(replaceCurlyBrackets(formatted)))
        } else {
          formatted = replaceParenthesis(replaceSquareBrackets(replaceCurlyBrackets(replaceComma(replaceColon(replaceFunction(replaceEqualSymbol(currentText)))))))
        }
        editBuilder.replace(range, formatted)
      })

      if (!insertionSuccess) return
    }

    if (option === 'formatLine') return vscode.commands.executeCommand('editor.action.insertLineAfter')

  })
}

function activate(context) {
  let formatLine = vscode.commands.registerCommand('suissize.formatLine', () => {
    suissize('formatLine')
  })

  let formatCode = vscode.commands.registerCommand('suissize.formatCode', () => {
    suissize('formatCode')
  })

  let formatIndentCode = vscode.commands.registerCommand('suissize.formatIndentCode', () => {
    suissize('formatIndentCode')
  })

  context.subscriptions.push(formatLine)
  context.subscriptions.push(formatCode)
  context.subscriptions.push(formatIndentCode)
}

exports.activate = activate
