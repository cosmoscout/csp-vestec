////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR                               //
//      and may be used under the terms of the MIT license. See the LICENSE file for details.     //
//                        Copyright: (c) 2019 German Aerospace Center (DLR)                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

#include "IncidentNode.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"
#include "../NodeEditor/NodeEditor.hpp"
#include "../Plugin.hpp"
#include "../logger.hpp"

#include <curlpp/Easy.hpp>
#include <curlpp/Info.hpp>
#include <curlpp/Infos.hpp>
#include <curlpp/Options.hpp>

IncidentNode::IncidentNode(cs::gui::GuiItem* pItem, int id)
    : VNE::Node(pItem, id) {
}

IncidentNode::~IncidentNode() {
}

std::string IncidentNode::GetName() {
  return "IncidentNode";
}

void IncidentNode::Init(VNE::NodeEditor* pEditor) {
  csp::vestec::logger().debug("[" + GetName() + "] Init");

  const std::string node =
      cs::utils::filesystem::loadToString("../share/resources/gui/js/csp-vestec-incident-node.js");
  pEditor->GetGuiItem()->executeJavascript(node);

  pEditor->GetGuiItem()->registerCallback("downloadDataSet", "Downlads a given Dataset",
      std::function([pEditor](std::string uuid, std::string token) {
        std::string   dl("../share/vestec/download/" + uuid);
        std::ofstream out;

        std::ifstream test(dl);
        if (test.good()) { // lol
          test.close();
          return;
        }

        std::cout << "Download dir: " << dl << " | UUID: " << uuid << " | Token: " << token << "\n";

        out.open(dl, std::ofstream::out | std::ofstream::binary);

        if (!out) {
          std::cout << "Failed to download tile data: Cannot open '{}' for writing!"
                    << "\n";
          return;
          /*logger().error(
              "Failed to download tile data: Cannot open '{}' for writing!", cacheFile.str());*/
        }

        std::list<std::string> header;
        header.push_back("Authorization: Bearer " + token);

        auto utl = "http://192.168.0.19/flask/data/" + uuid;

        curlpp::Easy request;
        request.setOpt(curlpp::options::HttpHeader(header));
        request.setOpt(curlpp::options::Url(utl));
        request.setOpt(curlpp::options::WriteStream(&out));
        request.setOpt(curlpp::options::NoSignal(true));

        request.perform();
        /*
                                                                    fail =
           curlpp::Info<CURLINFO_CONTENT_TYPE, std::string>::get(request).substr(0, 11) ==
                                                                           "application";*/
      }));
}
