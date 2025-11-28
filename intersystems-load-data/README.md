# intersystems-load-data

The "intersystems-load-data" allows you import csv and txt content into InterSystems IRIS using LOAD Data

## Features

1. Select files and load data into InterSystems IRIS
2. Set options before send the file
3. The extension sends the file to the intersystems iris using docker cp
4. The extension generate the load data command and executes it using the terminal.

## Requirements

It is required have an InterSystems IRIS instance running into a docker container.

## How to use

1. Go to the .vscode/settings.json and configure:
```
{
    ...

    "irisImporter.containerName":"name of your iris docker container. Eg.: iris-1",
    "irisImporter.namespace": "name of your namespace. Eg.: USER"
}
```

2. Make sure you have a Docker container running with Iris.

3. Make sure you have a text or CSV file to import and a destination table in IRIS. The header names in the file and the column names in the table must be the same.

4. Click right the CSV or TXT file and select the menu option Import to IRIS Docker Container.

5. Set the InterSystems IRIS SQL Table with the schema + . + table name. Eg.: dc_sample.Person

6. Click Load Data and check if the data was loaded using SQL Explorer.

## Extension Settings

This extension contributes the following settings:

* `irisImporter.containerName`: docker container name to send the file.
* `irisImporter.namespace`: iris namespace with the target table.

## Limitations

Works only with iris into docker containeres.

## Release Notes

### 1.0.0

Initial release 


**Enjoy!**
