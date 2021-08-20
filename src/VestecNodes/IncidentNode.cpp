////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR                               //
//      and may be used under the terms of the MIT license. See the LICENSE file for details.     //
//                        Copyright: (c) 2019 German Aerospace Center (DLR)                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

#include <future>
#include <iostream>
#include <thread>

#include "../../../../src/cs-utils/filesystem.hpp"
#include "../NodeEditor/NodeEditor.hpp"
#include "../Plugin.hpp"
#include "IncidentNode.hpp"

#include <curlpp/Easy.hpp>
#include <curlpp/Info.hpp>
#include <curlpp/Infos.hpp>
#include <curlpp/Options.hpp>
#include <utility>

#include <zipper/unzipper.h>

IncidentNode::IncidentNode(cs::gui::GuiItem* pItem, int id)
    : VNE::Node(pItem, id, 1, 5) {
}

////////////////////////////////////////////////////////////////////////////////////////////////////

IncidentNode::~IncidentNode() {
}

////////////////////////////////////////////////////////////////////////////////////////////////////

std::string IncidentNode::GetName() {
  return "IncidentNode";
}

////////////////////////////////////////////////////////////////////////////////////////////////////

void IncidentNode::Init(VNE::NodeEditor* pEditor) {
  csp::vestec::logger().debug("[{}] Init", GetName());

  const std::string node =
      cs::utils::filesystem::loadToString("../share/resources/gui/js/csp-vestec-incident-node.js");
  pEditor->GetGuiItem()->executeJavascript(node);

  pEditor->GetGuiItem()->registerCallback("incidentNode.downloadDataSet",
      "Downloads a given Dataset",
      std::function([pEditor](double id, std::string uuid, std::string token) {
        std::thread(std::function([pEditor, id, uuid, token]() {
          std::cout << "Downloading dataset" << uuid << std::endl;
          auto success = IncidentNode::DownloadDataset(uuid, token);

          pEditor->GetGuiItem()->callJavascript("IncidentNode.setDatasetReady", id, uuid, success);
        })).detach();
      }));

  pEditor->GetGuiItem()->registerCallback("incidentNode.extractDataSet", "Extracts a given Dataset",
      std::function([](std::string uuid, bool appendCDB = false) {
        std::thread(&IncidentNode::ExtractDataset, uuid, appendCDB).detach();
      }));

  pEditor->GetGuiItem()->registerCallback("incidentNode.downloadAndExtractDataSet",
      "Downloads ans extracts a given Dataset",
      std::function(
          [pEditor](double id, std::string uuid, std::string token, bool appendCDB = false) {
            // TODO: This is not ideal
            std::thread(std::function([pEditor, id, uuid, token, appendCDB]() {
              std::cout << "Downloading dataset" << uuid << std::endl;
              auto download = IncidentNode::DownloadDataset(uuid, token);

              std::cout << "Extracting dataset" << uuid << std::endl;
              auto extract = IncidentNode::ExtractDataset(uuid, appendCDB);

              pEditor->GetGuiItem()->callJavascript(
                  "IncidentNode.setDatasetReady", id, uuid, download && extract);
            })).detach();
          }));
}

////////////////////////////////////////////////////////////////////////////////////////////////////

bool IncidentNode::DownloadDataset(const std::string uuid, const std::string token) {
  std::string downloadPath(csp::vestec::Plugin::vestecDownloadDir + "/" + uuid);

  if (boost::filesystem::exists(downloadPath)) {
    return true;
  }

  std::ofstream out;

  out.open(downloadPath, std::ofstream::out | std::ofstream::binary);

  if (!out) {
    csp::vestec::logger().error("Failed to download vestec dataset '{}'.", uuid);
    return false;
  }

  std::list<std::string> header;
  header.push_back("Authorization: Bearer " + token);

  auto url = csp::vestec::Plugin::vestecServer + "/flask/data/" + uuid;

  csp::vestec::logger().debug("Downloading '{}' to '{}'.", url, downloadPath);

  curlpp::Easy request;
  request.setOpt(curlpp::options::ConnectTimeout(1L));
  request.setOpt(curlpp::options::HttpHeader(header));
  request.setOpt(curlpp::options::Url(url));
  request.setOpt(curlpp::options::WriteStream(&out));
  request.setOpt(curlpp::options::NoSignal(true));

  request.perform();
  request.reset();

  out.close();

  return true;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

bool IncidentNode::ExtractDataset(const std::string uuid, bool appendCDB) {

  std::string zip(csp::vestec::Plugin::vestecDownloadDir + "/" + uuid);
  std::string extract;

  if (appendCDB) {
    extract = csp::vestec::Plugin::vestecDownloadDir + "/extracted/" + uuid + ".cdb";
  } else {
    extract = csp::vestec::Plugin::vestecDownloadDir + "/extracted/" + uuid;
  }

  if (!boost::filesystem::exists(zip)) {
    csp::vestec::logger().debug(
        "File '{}' does not exist on '{}'.", uuid, csp::vestec::Plugin::vestecDownloadDir);
    return false;
  }

  if (boost::filesystem::exists(extract)) {
    csp::vestec::logger().debug("File '{}' already extracted in '{}'.", uuid, extract);
    return true;
  }

  cs::utils::filesystem::createDirectoryRecursively(extract);

  // TODO what happens if file isn't a zip
  zipper::Unzipper unzipper(zip);

  if (unzipper.entries().empty()) {
    csp::vestec::logger().debug("Zip file '{}' seems to be empty.", uuid);
    unzipper.close();
    return false;
  }

  csp::vestec::logger().debug("Extracting {} files to '{}'.", unzipper.entries().size(), extract);

  unzipper.extract(extract);
  unzipper.close();

  return true;
}
