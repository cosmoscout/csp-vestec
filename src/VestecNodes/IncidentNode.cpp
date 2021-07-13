////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR                               //
//      and may be used under the terms of the MIT license. See the LICENSE file for details.     //
//                        Copyright: (c) 2019 German Aerospace Center (DLR)                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

#include "IncidentNode.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"
#include "../NodeEditor/NodeEditor.hpp"
#include "../Plugin.hpp"

#include <curlpp/Easy.hpp>
#include <curlpp/Info.hpp>
#include <curlpp/Infos.hpp>
#include <curlpp/Options.hpp>

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
      "Downloads a given Dataset", std::function([](std::string uuid, std::string token) {
        std::string downloadPath(csp::vestec::Plugin::vestecDownloadDir + "/" + uuid);

        if (boost::filesystem::exists(downloadPath)) {
          return;
        }

        std::ofstream out;

        out.open(downloadPath, std::ofstream::out | std::ofstream::binary);

        if (!out) {
          csp::vestec::logger().error("Failed to download vestec dataset '{}'.", uuid);
          return;
        }

        std::list<std::string> header;
        header.push_back("Authorization: Bearer " + token);

        auto url = csp::vestec::Plugin::vestecServer + "/flask/data/" + uuid;

        csp::vestec::logger().debug("Downloading '{}' to '{}'.", url, downloadPath);

        curlpp::Easy request;
        request.setOpt(curlpp::options::HttpHeader(header));
        request.setOpt(curlpp::options::Url(url));
        request.setOpt(curlpp::options::WriteStream(&out));
        request.setOpt(curlpp::options::NoSignal(true));

        request.perform();
        request.reset();

        out.close();
      }));

  pEditor->GetGuiItem()->registerCallback("incidentNode.extractDataSet", "Extracts a given Dataset",
      std::function([](std::string uuid, bool appendCDB = false) {
        std::string zip(csp::vestec::Plugin::vestecDownloadDir + "/" + uuid);
        std::string extract(csp::vestec::Plugin::vestecDownloadDir + "/extracted/" + uuid);

        if (appendCDB) {
          extract = csp::vestec::Plugin::vestecDownloadDir + "/extracted/" + uuid + ".cdb";
        }

        if (!boost::filesystem::exists(zip)) {
          csp::vestec::logger().debug(
              "File '{}' does not exist on '{}'.", uuid, csp::vestec::Plugin::vestecDownloadDir);
          return;
        }

        if (boost::filesystem::exists(extract)) {
          csp::vestec::logger().debug("File '{}' already extracted in '{}'.", uuid, extract);
          return;
        }

        cs::utils::filesystem::createDirectoryRecursively(extract);

        // TODO what happens if file isn't a zip
        zipper::Unzipper unzipper(zip);

        if (unzipper.entries().empty()) {
          csp::vestec::logger().debug("Zip file '{}' seems to be empty.", uuid);
          unzipper.close();
          return;
        }

        csp::vestec::logger().debug(
            "Extracting {} files to '{}'.", unzipper.entries().size(), extract);

        unzipper.extract(extract);
        unzipper.close();
      }));
}
